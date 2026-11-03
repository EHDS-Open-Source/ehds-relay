"""Revalidation reminder date, the overdue flag, and the helper the reminder email uses."""

import uuid
from collections.abc import Iterator
from datetime import UTC, date, datetime, timedelta
from typing import Any

import pytest
from alembic import command
from alembic.config import Config
from alembic.script import ScriptDirectory
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine, make_url, text, update
from sqlalchemy.orm import Session, sessionmaker

from relay.domain.datasets import Dataset, add_one_year, is_overdue, last_validated
from relay.domain.memberships import Membership
from relay.domain.organisations import Organisation
from relay.domain.reminders import due_revalidation_reminders, mark_revalidation_reminder_sent
from relay.domain.users import AppUser
from tests.conftest import APP_PASSWORD, APP_ROLE, AsUser
from tests.test_datasets import TITLED, complete_metadata

ORGS = "/api/v1/organisations"


def _today() -> date:
    return datetime.now(UTC).date()


def _in_a_year() -> date:
    return add_one_year(datetime.now(UTC)).date()


def ds_url(org_id: str, *parts: str) -> str:
    return "/".join([f"{ORGS}/{org_id}/datasets", *parts])


def reminder_url(org_id: str, ds_id: str) -> str:
    return ds_url(org_id, ds_id, "revalidation-reminder")


def _create(client: TestClient, org_id: str, *, publish: bool = False) -> dict[str, Any]:
    meta = complete_metadata() if publish else TITLED
    res = client.post(ds_url(org_id), json={"metadata": meta, "publish": publish})
    assert res.status_code == 201, res.text
    return res.json()


def _put_reminder(client: TestClient, org_id: str, ds_id: str, when: date | None) -> Any:
    return client.put(
        reminder_url(org_id, ds_id),
        json={"reminder_date": when.isoformat() if when else None},
    )


def _set_columns(db: sessionmaker[Session], ds_id: str, **values: Any) -> None:
    """Arrange dates directly, as the superuser (not subject to row-level security)."""
    with db() as session:
        session.execute(update(Dataset).where(Dataset.id == uuid.UUID(ds_id)).values(**values))
        session.commit()


# --- ADD-12: set a reminder from the record -------------------------------------------------


def test_add_12_member_sets_reminder(client: TestClient, org: str, owner: AppUser) -> None:
    ds = _create(client, org)
    assert ds["reminder_date"] is None
    assert ds["reminder_set_by"] is None

    when = _in_a_year()
    res = _put_reminder(client, org, ds["id"], when)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["reminder_date"] == when.isoformat()
    assert body["reminder_set_by"] == str(owner.id)
    assert body["reminder_set_by_name"] == owner.name
    assert body["reminder_set_at"] is not None
    assert body["reminder_sent_at"] is None
    # Not metadata: the version and last-changed time stay put, and the metadata is the same
    assert body["version"] == ds["version"]
    assert body["updated_at"] == ds["updated_at"]
    assert body["metadata"] == ds["metadata"]

    assert client.get(ds_url(org, ds["id"])).json() == body
    assert client.get(ds_url(org)).json() == [body]


def test_add_12_standard_member_can_set_reminder(
    client: TestClient, org: str, standard: AppUser, as_user: AsUser
) -> None:
    ds = _create(client, org)
    res = _put_reminder(as_user(standard), org, ds["id"], _in_a_year())
    assert res.status_code == 200, res.text
    assert res.json()["reminder_set_by"] == str(standard.id)
    assert res.json()["reminder_set_by_name"] == standard.name


def test_add_12_clear_reminder(client: TestClient, org: str) -> None:
    ds = _create(client, org)
    _put_reminder(client, org, ds["id"], _in_a_year())
    res = _put_reminder(client, org, ds["id"], None)
    assert res.status_code == 200, res.text
    body = res.json()
    assert (body["reminder_date"], body["reminder_set_by"], body["reminder_set_at"]) == (
        None,
        None,
        None,
    )
    # Clearing when nothing is set is fine too
    assert _put_reminder(client, org, ds["id"], None).status_code == 200


def test_add_12_reminder_not_in_exported_record(client: TestClient, org: str) -> None:
    ds = _create(client, org, publish=True)
    before = client.get(ds_url(org, ds["id"], "export"), params={"format": "ttl"})
    assert before.status_code == 200, before.text
    _put_reminder(client, org, ds["id"], _in_a_year())
    after = client.get(ds_url(org, ds["id"], "export"), params={"format": "ttl"})
    assert after.text == before.text
    assert "reminder" not in after.text.lower()
    assert "revalidat" not in after.text.lower()


def test_add_12_open_edit_form_does_not_conflict(client: TestClient, org: str) -> None:
    ds = _create(client, org)
    _put_reminder(client, org, ds["id"], _in_a_year())
    res = client.put(ds_url(org, ds["id"]), json={"metadata": TITLED, "version": ds["version"]})
    assert res.status_code == 200, res.text
    # Saving the metadata keeps the reminder
    assert res.json()["reminder_date"] == _in_a_year().isoformat()


def test_add_12_outsider_and_anonymous(
    client: TestClient, org: str, outsider: AppUser, as_user: AsUser, anon_client: TestClient
) -> None:
    ds = _create(client, org)
    res = _put_reminder(as_user(outsider), org, ds["id"], _in_a_year())
    assert res.status_code == 404
    assert _put_reminder(anon_client, org, ds["id"], _in_a_year()).status_code == 401
    assert _put_reminder(client, org, str(uuid.uuid4()), _in_a_year()).status_code == 404
    assert client.get(ds_url(org, ds["id"])).json()["reminder_date"] is None


# --- EDIT-11: change the date; it must be in the future -------------------------------------


def test_edit_11_change_reminder_date(
    client: TestClient, org: str, standard: AppUser, as_user: AsUser, db: sessionmaker[Session]
) -> None:
    ds = _create(client, org)
    _put_reminder(client, org, ds["id"], _in_a_year())
    _set_columns(db, ds["id"], reminder_sent_at=datetime.now(UTC))

    new_date = _today() + timedelta(days=30)
    res = _put_reminder(as_user(standard), org, ds["id"], new_date)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["reminder_date"] == new_date.isoformat()
    # The reminder now belongs to whoever changed it, and is sent again on the new date
    assert body["reminder_set_by"] == str(standard.id)
    assert body["reminder_sent_at"] is None


@pytest.mark.parametrize(
    ("days", "ok"),
    [(-365, False), (-1, False), (0, False), (1, True), (365, True)],
    ids=["last year", "yesterday", "today", "tomorrow", "next year"],
)
def test_edit_11_date_must_be_in_future(client: TestClient, org: str, days: int, ok: bool) -> None:
    ds = _create(client, org)
    res = _put_reminder(client, org, ds["id"], _today() + timedelta(days=days))
    if ok:
        assert res.status_code == 200, res.text
    else:
        assert res.status_code == 422
        assert res.json()["detail"] == "the reminder date must be in the future"
        assert client.get(ds_url(org, ds["id"])).json()["reminder_date"] is None


def test_edit_11_date_at_most_five_years_ahead(client: TestClient, org: str) -> None:
    ds = _create(client, org)
    today = _today()
    try:
        limit = today.replace(year=today.year + 5)
    except ValueError:
        limit = today.replace(year=today.year + 5, day=28)
    assert _put_reminder(client, org, ds["id"], limit).status_code == 200
    res = _put_reminder(client, org, ds["id"], limit + timedelta(days=1))
    assert res.status_code == 422
    assert res.json()["detail"] == "the reminder date must be at most 5 years ahead"


@pytest.mark.parametrize(
    "body",
    [{}, {"reminder_date": "not a date"}, {"reminder_date": "2030-02-30"}, {"due_date": None}],
    ids=["missing", "not a date", "impossible date", "unknown field"],
)
def test_edit_11_rejects_malformed_body(client: TestClient, org: str, body: Any) -> None:
    ds = _create(client, org)
    assert client.put(reminder_url(org, ds["id"]), json=body).status_code == 422


# --- EDIT-14: overdue flag -----------------------------------------------------------------


def test_edit_14_publish_records_validation_date(client: TestClient, org: str) -> None:
    draft = _create(client, org)
    assert draft["published_at"] is None
    assert draft["last_validated_at"] is None
    assert draft["overdue"] is False

    published = _create(client, org, publish=True)
    assert published["published_at"] is not None
    assert published["last_validated_at"] == published["published_at"]
    assert published["overdue"] is False


def test_edit_14_publish_route_and_resave_update_validation_date(
    client: TestClient, org: str, db: sessionmaker[Session]
) -> None:
    res = client.post(ds_url(org), json={"metadata": complete_metadata()})
    ds = res.json()
    assert ds["published_at"] is None
    res = client.post(ds_url(org, ds["id"], "publish"), json={"version": ds["version"]})
    assert res.status_code == 200, res.text
    ds = res.json()
    assert ds["published_at"] is not None

    long_ago = datetime.now(UTC) - timedelta(days=800)
    _set_columns(db, ds["id"], published_at=long_ago)
    assert client.get(ds_url(org, ds["id"])).json()["overdue"] is True

    # Saving as a draft keeps the date, and drafts are never overdue
    res = client.put(
        ds_url(org, ds["id"]), json={"metadata": complete_metadata(), "version": ds["version"]}
    )
    ds = res.json()
    assert ds["status"] == "draft"
    assert datetime.fromisoformat(ds["published_at"]) == long_ago
    assert ds["overdue"] is False

    # Publishing again passes the checks again, which counts as a fresh validation
    res = client.put(
        ds_url(org, ds["id"]),
        json={"metadata": complete_metadata(), "version": ds["version"], "publish": True},
    )
    ds = res.json()
    assert datetime.fromisoformat(ds["published_at"]) > long_ago
    assert ds["overdue"] is False


@pytest.mark.parametrize(
    ("published_days_ago", "revalidated_days_ago", "status", "overdue"),
    [
        (364, None, "published", False),
        (367, None, "published", True),
        (800, 10, "published", False),
        (800, 400, "published", True),
        (800, None, "draft", False),
        (None, None, "published", False),
    ],
    ids=[
        "published under a year ago",
        "published over a year ago",
        "revalidated recently",
        "revalidated over a year ago",
        "draft",
        "never validated",
    ],
)
def test_edit_14_overdue_on_record_and_list(
    client: TestClient,
    org: str,
    db: sessionmaker[Session],
    published_days_ago: int | None,
    revalidated_days_ago: int | None,
    status: str,
    overdue: bool,
) -> None:
    ds = _create(client, org, publish=True)
    now = datetime.now(UTC)

    def ago(days: int | None) -> datetime | None:
        return None if days is None else now - timedelta(days=days)

    _set_columns(
        db,
        ds["id"],
        status=status,
        published_at=ago(published_days_ago),
        last_revalidated_at=ago(revalidated_days_ago),
    )
    got = client.get(ds_url(org, ds["id"])).json()
    assert got["overdue"] is overdue
    assert [d["overdue"] for d in client.get(ds_url(org)).json()] == [overdue]
    expected = last_validated(ago(published_days_ago), ago(revalidated_days_ago))
    if expected is None:
        assert got["last_validated_at"] is None
    else:
        assert datetime.fromisoformat(got["last_validated_at"]) == expected


def test_edit_14_overdue_edges() -> None:
    validated = datetime(2025, 3, 10, 12, 0, tzinfo=UTC)
    year_later = datetime(2026, 3, 10, 12, 0, tzinfo=UTC)
    assert not is_overdue("published", validated, year_later - timedelta(seconds=1))
    assert is_overdue("published", validated, year_later)
    assert not is_overdue("draft", validated, year_later + timedelta(days=100))
    assert not is_overdue("published", None, year_later)
    # 29 February rolls to 28 February, as Postgres does
    leap = datetime(2028, 2, 29, 9, 0, tzinfo=UTC)
    assert add_one_year(leap) == datetime(2029, 2, 28, 9, 0, tzinfo=UTC)
    assert is_overdue("published", leap, datetime(2029, 2, 28, 9, 0, tzinfo=UTC))
    assert not is_overdue("published", leap, datetime(2029, 2, 28, 8, 59, tzinfo=UTC))
    assert last_validated(validated, year_later) == year_later
    assert last_validated(year_later, validated) == year_later
    assert last_validated(None, validated) == validated


# --- The helper the reminder email uses ----------------------------------------------------


@pytest.fixture
def app_session(app_engine: Engine) -> Iterator[Session]:
    """A session as the app's role, so row-level security applies, as in the worker."""
    with sessionmaker(bind=app_engine)() as session:
        yield session


def test_due_reminders_across_organisations(
    client: TestClient,
    org: str,
    owner: AppUser,
    standard: AppUser,
    outsider: AppUser,
    as_user: AsUser,
    db: sessionmaker[Session],
    app_session: Session,
) -> None:
    other_client = as_user(outsider)
    other_org = other_client.post(ORGS, json={"name": "Beta", "country": "BE"}).json()["id"]
    deleted_org = other_client.post(ORGS, json={"name": "Gone", "country": "BE"}).json()["id"]

    due_past = _create(client, org)
    due_today = _create(client, org)
    not_yet = _create(client, org)
    already_sent = _create(client, org)
    cleared = _create(client, org)
    left_org = _create(client, org)
    other = _create(other_client, other_org)
    in_deleted = _create(other_client, deleted_org)
    _create(client, org)  # never had a reminder

    for ds in (due_past, due_today, not_yet, already_sent, cleared):
        assert _put_reminder(client, org, ds["id"], _in_a_year()).status_code == 200
    assert _put_reminder(as_user(standard), org, left_org["id"], _in_a_year()).status_code == 200
    _put_reminder(other_client, other_org, other["id"], _in_a_year())
    _put_reminder(other_client, deleted_org, in_deleted["id"], _in_a_year())
    _put_reminder(client, org, cleared["id"], None)

    today = _today()
    # Dates only pass by waiting, so move them back directly
    for ds, when in [
        (due_past, today - timedelta(days=3)),
        (due_today, today),
        (not_yet, today + timedelta(days=1)),
        (already_sent, today - timedelta(days=1)),
        (left_org, today - timedelta(days=2)),
        (other, today - timedelta(days=1)),
        (in_deleted, today - timedelta(days=1)),
    ]:
        _set_columns(db, ds["id"], reminder_date=when)
    _set_columns(db, already_sent["id"], reminder_sent_at=datetime.now(UTC))
    with db() as session:
        session.execute(
            update(Organisation)
            .where(Organisation.id == uuid.UUID(deleted_org))
            .values(status="deleted")
        )
        session.query(Membership).filter_by(org_id=uuid.UUID(org), user_id=standard.id).delete()
        session.commit()

    due = due_revalidation_reminders(app_session, today)
    by_id = {str(r.dataset_id): r for r in due}
    assert set(by_id) == {due_past["id"], due_today["id"], left_org["id"], other["id"]}

    r = by_id[due_past["id"]]
    assert (str(r.org_id), r.reminder_date, r.dataset_title) == (
        org,
        today - timedelta(days=3),
        "Draft",
    )
    assert (r.recipient_id, r.recipient_email, r.recipient_name) == (
        owner.id,
        owner.email,
        owner.name,
    )
    assert by_id[other["id"]].recipient_email == outsider.email
    # The member who set it has left: no recipient, the caller decides who to tell
    gone = by_id[left_org["id"]]
    assert (gone.recipient_id, gone.recipient_email) == (None, None)

    # Marking one sent takes it off the list; a date changed meanwhile is not marked
    assert mark_revalidation_reminder_sent(
        app_session, uuid.UUID(org), uuid.UUID(due_past["id"]), today - timedelta(days=3)
    )
    assert not mark_revalidation_reminder_sent(
        app_session, uuid.UUID(org), uuid.UUID(due_today["id"]), today - timedelta(days=9)
    )
    app_session.commit()
    remaining = {str(r.dataset_id) for r in due_revalidation_reminders(app_session, today)}
    assert remaining == {due_today["id"], left_org["id"], other["id"]}
    # Marking sent is not a metadata change either
    after = client.get(ds_url(org, due_past["id"])).json()
    assert after["reminder_sent_at"] is not None
    assert after["version"] == due_past["version"]


def test_due_reminders_default_to_today(
    client: TestClient, org: str, db: sessionmaker[Session], app_session: Session
) -> None:
    ds = _create(client, org)
    _put_reminder(client, org, ds["id"], _in_a_year())
    assert due_revalidation_reminders(app_session) == []
    _set_columns(db, ds["id"], reminder_date=_today())
    assert [str(r.dataset_id) for r in due_revalidation_reminders(app_session)] == [ds["id"]]


def test_rls_covers_reminder_columns(client: TestClient, app_engine: Engine) -> None:
    a = client.post(ORGS, json={"name": "A", "country": "NL"}).json()["id"]
    b = client.post(ORGS, json={"name": "B", "country": "NL"}).json()["id"]
    b_ds = _create(client, b)
    with app_engine.connect() as conn, conn.begin():
        conn.execute(text("SELECT set_config('app.current_org_id', :id, true)"), {"id": a})
        res = conn.execute(
            text("UPDATE dataset SET reminder_date = CURRENT_DATE + 30 WHERE id = :id"),
            {"id": b_ds["id"]},
        )
        assert res.rowcount == 0
        seen = conn.scalars(
            text("SELECT reminder_date FROM dataset WHERE reminder_date IS NOT NULL")
        ).all()
        assert seen == []
    assert client.get(ds_url(b, b_ds["id"])).json()["reminder_date"] is None


# --- Migration -----------------------------------------------------------------------------


def test_migration_0009_round_trip(database_url: str) -> None:
    """Upgrade, downgrade and upgrade again on a database of its own, with a published row
    from before the migration to check the backfill."""
    name = f"migrate_{uuid.uuid4().hex[:8]}"
    admin = create_engine(database_url, isolation_level="AUTOCOMMIT")
    with admin.connect() as conn:
        conn.execute(text(f"CREATE DATABASE {name} OWNER {APP_ROLE}"))
    base = make_url(database_url).set(database=name)
    app_url = base.set(username=APP_ROLE, password=APP_PASSWORD).render_as_string(
        hide_password=False
    )
    cfg = Config("alembic.ini")
    cfg.attributes["database_url"] = app_url
    assert len(ScriptDirectory.from_config(cfg).get_heads()) == 1
    super_engine = create_engine(base.render_as_string(hide_password=False))
    try:
        command.upgrade(cfg, "0008")
        with super_engine.begin() as conn:
            org_id = conn.scalar(text("INSERT INTO organisation (name) VALUES ('X') RETURNING id"))
            conn.execute(
                text(
                    "INSERT INTO dataset (org_id, status, schema_version, updated_at) VALUES "
                    "(:o, 'published', 'v', '2024-05-01T10:00:00Z'), (:o, 'draft', 'v', now())"
                ),
                {"o": org_id},
            )
        command.upgrade(cfg, "head")
        with super_engine.begin() as conn:
            rows = conn.execute(
                text("SELECT status, published_at, updated_at FROM dataset ORDER BY status")
            ).all()
            assert rows[0].published_at is None  # draft
            assert rows[1].published_at == rows[1].updated_at  # published, backfilled
            forced = conn.scalar(
                text("SELECT relforcerowsecurity FROM pg_class WHERE relname = 'dataset'")
            )
            assert forced is True
        command.downgrade(cfg, "0008")
        with super_engine.begin() as conn:
            cols = conn.scalars(
                text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_name = 'dataset' AND column_name LIKE 'reminder%'"
                )
            ).all()
            assert cols == []
        command.upgrade(cfg, "head")
    finally:
        super_engine.dispose()
        with admin.connect() as conn:
            conn.execute(text(f"DROP DATABASE {name} WITH (FORCE)"))
        admin.dispose()
