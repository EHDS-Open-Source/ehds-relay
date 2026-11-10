"""The worker job that queues revalidation reminder emails."""

import uuid
from datetime import UTC, date, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, select, update
from sqlalchemy.orm import Session, sessionmaker

from relay.domain.email_outbox import EmailOutbox
from relay.domain.memberships import Membership
from relay.domain.notifications import NotificationKind, set_notification
from relay.domain.organisations import Organisation
from relay.domain.users import AppUser
from relay.jobs import reminders
from relay.jobs.email import send_pending_emails
from relay.jobs.reminders import queue_revalidation_reminders
from relay.settings import Settings
from tests.conftest import AddMember, AsUser, MakeUser
from tests.test_revalidation_reminder import (
    _create,  # pyright: ignore[reportPrivateUsage]
    _put_reminder,  # pyright: ignore[reportPrivateUsage]
    _set_columns,  # pyright: ignore[reportPrivateUsage]
    _today,  # pyright: ignore[reportPrivateUsage]
)

SETTINGS = Settings(web_url="http://web.test/")


@pytest.fixture
def app_sessions(app_engine: Engine) -> sessionmaker[Session]:
    """Sessions as the app's role, so row-level security applies, as in the worker."""
    return sessionmaker(bind=app_engine)


def _outbox(db: sessionmaker[Session]) -> list[EmailOutbox]:
    with db() as session:
        return list(session.scalars(select(EmailOutbox).order_by(EmailOutbox.to_address)))


def _recipients(db: sessionmaker[Session]) -> list[str]:
    return [row.to_address for row in _outbox(db)]


def _due(client: TestClient, org: str, db: sessionmaker[Session], *, publish: bool = True) -> str:
    """A dataset set by the signed-in user whose reminder date is in the past."""
    ds = _create(client, org, publish=publish)
    assert _put_reminder(client, org, ds["id"], _today() + timedelta(days=30)).status_code == 200
    _set_columns(db, ds["id"], reminder_date=_today() - timedelta(days=2))
    return str(ds["id"])


def _sent_at(db: sessionmaker[Session], ds_id: str) -> datetime | None:
    from relay.domain.datasets import Dataset

    with db() as session:
        return session.scalars(
            select(Dataset.reminder_sent_at).where(Dataset.id == uuid.UUID(ds_id))
        ).one()


def test_due_published_dataset_queues_one_email_per_recipient(
    client: TestClient,
    org: str,
    owner: AppUser,
    standard: AppUser,
    db: sessionmaker[Session],
    app_sessions: sessionmaker[Session],
    as_user: AsUser,
    add_member: AddMember,
    make_user: MakeUser,
) -> None:
    second_owner = make_user("owner2@example.org", "Second Owner")
    add_member(org, second_owner, "owner")
    # The setter is a Standard member
    ds = _create(as_user(standard), org, publish=True)
    _put_reminder(as_user(standard), org, ds["id"], _today() + timedelta(days=5))
    _set_columns(db, ds["id"], reminder_date=_today())

    assert queue_revalidation_reminders(app_sessions, SETTINGS) == 3

    rows = _outbox(db)
    assert [r.to_address for r in rows] == sorted([owner.email, second_owner.email, standard.email])
    assert _sent_at(db, ds["id"]) is not None
    row = rows[0]
    assert "Acme" in row.text_body  # pyright: ignore[reportOperatorIssue]
    assert f"http://web.test/orgs/{org}/datasets/{ds['id']}" in (row.text_body or "")
    assert row.subject.startswith("Time to re-check your dataset")

    # Nothing more on a re-run
    assert queue_revalidation_reminders(app_sessions, SETTINGS) == 0
    assert len(_outbox(db)) == 3


def test_changed_date_queues_a_new_email(
    client: TestClient,
    org: str,
    db: sessionmaker[Session],
    app_sessions: sessionmaker[Session],
) -> None:
    ds_id = _due(client, org, db)
    assert queue_revalidation_reminders(app_sessions, SETTINGS) == 1
    # Setting a new date makes it unsent again; it fires when the date arrives
    _put_reminder(client, org, ds_id, _today() + timedelta(days=10))
    assert queue_revalidation_reminders(app_sessions, SETTINGS) == 0
    assert queue_revalidation_reminders(app_sessions, SETTINGS, _today() + timedelta(days=10)) == 1
    assert len(_outbox(db)) == 2


def test_opted_out_recipient_gets_nothing(
    client: TestClient,
    org: str,
    owner: AppUser,
    db: sessionmaker[Session],
    app_sessions: sessionmaker[Session],
    add_member: AddMember,
    make_user: MakeUser,
) -> None:
    other = make_user("owner2@example.org", "Second Owner")
    add_member(org, other, "owner")
    with db() as session:
        set_notification(session, owner.id, NotificationKind.REVALIDATION_REMINDER, False)
        session.commit()
    _due(client, org, db)

    assert queue_revalidation_reminders(app_sessions, SETTINGS) == 1
    assert _recipients(db) == [other.email]


def test_everyone_opted_out_still_marks_sent(
    client: TestClient,
    org: str,
    owner: AppUser,
    db: sessionmaker[Session],
    app_sessions: sessionmaker[Session],
) -> None:
    with db() as session:
        set_notification(session, owner.id, NotificationKind.REVALIDATION_REMINDER, False)
        session.commit()
    ds_id = _due(client, org, db)

    assert queue_revalidation_reminders(app_sessions, SETTINGS) == 0
    assert _outbox(db) == []
    assert _sent_at(db, ds_id) is not None


def test_draft_is_left_unsent_until_published(
    client: TestClient,
    org: str,
    db: sessionmaker[Session],
    app_sessions: sessionmaker[Session],
) -> None:
    ds_id = _due(client, org, db, publish=False)
    assert queue_revalidation_reminders(app_sessions, SETTINGS) == 0
    assert _outbox(db) == []
    assert _sent_at(db, ds_id) is None

    _set_columns(db, ds_id, status="published", published_at=datetime.now(UTC))
    assert queue_revalidation_reminders(app_sessions, SETTINGS) == 1


def test_not_due_cleared_and_deleted_org_queue_nothing(
    client: TestClient,
    org: str,
    db: sessionmaker[Session],
    app_sessions: sessionmaker[Session],
) -> None:
    future = _create(client, org, publish=True)
    _put_reminder(client, org, future["id"], _today() + timedelta(days=3))
    cleared = _create(client, org, publish=True)
    _put_reminder(client, org, cleared["id"], _today() + timedelta(days=3))
    _put_reminder(client, org, cleared["id"], None)
    _create(client, org, publish=True)  # overdue-style dataset with no reminder
    assert queue_revalidation_reminders(app_sessions, SETTINGS) == 0

    _due(client, org, db)
    with db() as session:
        session.execute(
            update(Organisation).where(Organisation.id == uuid.UUID(org)).values(status="deleted")
        )
        session.commit()
    assert queue_revalidation_reminders(app_sessions, SETTINGS) == 0
    assert _outbox(db) == []


def test_organisations_are_independent(
    client: TestClient,
    org: str,
    owner: AppUser,
    db: sessionmaker[Session],
    app_sessions: sessionmaker[Session],
) -> None:
    other = client.post("/api/v1/organisations", json={"name": "Beta", "country": "DE"}).json()
    _due(client, org, db)
    _due(client, other["id"], db)

    assert queue_revalidation_reminders(app_sessions, SETTINGS) == 2
    texts = [r.text_body or "" for r in _outbox(db)]
    assert sum("Acme" in t for t in texts) == 1
    assert sum("Beta" in t for t in texts) == 1


def test_setter_who_left_is_not_emailed(
    client: TestClient,
    org: str,
    owner: AppUser,
    standard: AppUser,
    db: sessionmaker[Session],
    app_sessions: sessionmaker[Session],
    as_user: AsUser,
) -> None:
    ds = _create(as_user(standard), org, publish=True)
    _put_reminder(as_user(standard), org, ds["id"], _today() + timedelta(days=5))
    _set_columns(db, ds["id"], reminder_date=_today())
    with db() as session:
        session.query(Membership).filter_by(org_id=uuid.UUID(org), user_id=standard.id).delete()
        session.commit()

    assert queue_revalidation_reminders(app_sessions, SETTINGS) == 1
    assert _recipients(db) == [owner.email]


def test_date_changed_between_listing_and_marking_queues_nothing(
    client: TestClient,
    org: str,
    db: sessionmaker[Session],
    app_sessions: sessionmaker[Session],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    ds_id = _due(client, org, db)
    real = reminders.due_revalidation_reminders

    def list_then_change(session: Session, today: date | None = None):  # type: ignore[no-untyped-def]
        found = real(session, today)
        _set_columns(db, ds_id, reminder_date=_today() + timedelta(days=9))
        return found

    monkeypatch.setattr(reminders, "due_revalidation_reminders", list_then_change)
    assert queue_revalidation_reminders(app_sessions, SETTINGS) == 0
    assert _outbox(db) == []
    assert _sent_at(db, ds_id) is None


def test_queued_reminders_are_delivered_by_the_outbox_job(
    client: TestClient,
    org: str,
    owner: AppUser,
    db: sessionmaker[Session],
    app_sessions: sessionmaker[Session],
) -> None:
    _due(client, org, db)
    queue_revalidation_reminders(app_sessions, SETTINGS)
    sent: list[str] = []
    count = send_pending_emails(
        db, SETTINGS, sender=lambda row, _settings: sent.append(row.to_address)
    )
    assert count == 1
    assert sent == [owner.email]
