"""Revalidation reminders: setting the date on a dataset, and finding the ones that are due.

Reminders are app data kept on the dataset row, beside the metadata. Writing them never bumps
the dataset's version or its "last changed" time, so an edit form that is open at the same
time does not hit a version conflict.
"""

import uuid
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime
from typing import Any, cast

from sqlalchemy import CursorResult, func, select, update
from sqlalchemy.orm import Session

from relay.db import set_tenant
from relay.domain.datasets import Dataset
from relay.domain.memberships import Membership
from relay.domain.organisations import Organisation, OrganisationStatus
from relay.domain.users import AppUser


def set_reminder(
    session: Session, ds: Dataset, reminder_date: date | None, user_id: uuid.UUID
) -> None:
    """Set, change or clear (`None`) the reminder date. Commits and refreshes `ds`.

    Setting a date records who set it and when, and makes it unsent again, so a changed date
    gets its own email. Clearing removes all of it.
    """
    values: dict[str, object] = {"reminder_sent_at": None}
    if reminder_date is None:
        values |= {"reminder_date": None, "reminder_set_by": None, "reminder_set_at": None}
    else:
        values |= {
            "reminder_date": reminder_date,
            "reminder_set_by": user_id,
            "reminder_set_at": func.now(),
        }
    # A plain UPDATE, not a flush: the ORM would bump the version column
    session.execute(
        update(Dataset)
        .where(Dataset.id == ds.id, Dataset.org_id == ds.org_id)
        .values(**values)
        .execution_options(synchronize_session=False)
    )
    session.commit()
    session.refresh(ds)


@dataclass(frozen=True)
class DueReminder:
    """A reminder to send: the dataset and the member it is for.

    `recipient_*` are None when the person who set it has since left the organisation or
    been removed; the caller decides who to tell instead.
    """

    org_id: uuid.UUID
    dataset_id: uuid.UUID
    dataset_title: str | None
    reminder_date: date
    recipient_id: uuid.UUID | None
    recipient_email: str | None
    recipient_name: str | None


def _due_in_tenant(session: Session, org_id: uuid.UUID, today: date) -> list[DueReminder]:
    still_member = select(Membership.user_id).where(
        Membership.org_id == org_id, Membership.user_id == Dataset.reminder_set_by
    )
    stmt = (
        select(
            Dataset.id,
            Dataset.title,
            Dataset.reminder_date,
            AppUser.id,
            AppUser.email,
            AppUser.name,
        )
        .outerjoin(
            AppUser,
            (AppUser.id == Dataset.reminder_set_by) & still_member.exists(),
        )
        .where(
            Dataset.org_id == org_id,
            Dataset.reminder_date.is_not(None),
            Dataset.reminder_date <= today,
            Dataset.reminder_sent_at.is_(None),
        )
        .order_by(Dataset.reminder_date, Dataset.id)
    )
    return [
        # The query only returns rows with a date
        DueReminder(org_id, ds_id, title, cast(date, when), uid, email, name)
        for ds_id, title, when, uid, email, name in session.execute(stmt).all()
    ]


def due_revalidation_reminders(session: Session, today: date | None = None) -> list[DueReminder]:
    """Reminders due on or before `today` (default: today in UTC) that were not sent yet, in
    every organisation that is not deleted.

    Row-level security shows one organisation's datasets at a time, so this scopes the session
    to each organisation in turn. The session is left scoped to the last one: use a session of
    its own, as a worker job would.
    """
    today = today or datetime.now(UTC).date()
    org_ids: Sequence[uuid.UUID] = session.scalars(
        select(Organisation.id)
        .where(Organisation.status != OrganisationStatus.DELETED.value)
        .order_by(Organisation.id)
    ).all()
    due: list[DueReminder] = []
    for org_id in org_ids:
        set_tenant(session, org_id)
        due.extend(_due_in_tenant(session, org_id, today))
    return due


def mark_revalidation_reminder_sent(
    session: Session,
    org_id: uuid.UUID,
    dataset_id: uuid.UUID,
    reminder_date: date,
    sent_at: datetime | None = None,
) -> bool:
    """Record that the reminder for `reminder_date` went out. Does not commit.

    Returns False when the date was changed or cleared in the meantime, so the caller does
    not mark a newer reminder as sent.
    """
    set_tenant(session, org_id)
    result: CursorResult[Any] = session.execute(  # pyright: ignore[reportAssignmentType]
        update(Dataset)
        .where(
            Dataset.id == dataset_id,
            Dataset.org_id == org_id,
            Dataset.reminder_date == reminder_date,
            Dataset.reminder_sent_at.is_(None),
        )
        .values(reminder_sent_at=sent_at or func.now())
        .execution_options(synchronize_session=False)
    )
    return result.rowcount == 1
