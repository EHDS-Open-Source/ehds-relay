"""Queuing revalidation reminder emails. Called by the worker's periodic task; tests call it
directly. The email outbox then delivers them."""

import logging
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from relay.db import set_tenant
from relay.domain.datasets import Dataset, DatasetStatus
from relay.domain.notifications import NotificationKind, is_enabled
from relay.domain.organisations import Organisation
from relay.domain.reminders import (
    DueReminder,
    due_revalidation_reminders,
    mark_revalidation_reminder_sent,
    reminder_recipients,
)
from relay.email.messages import revalidation_reminder_email
from relay.email.outbox import enqueue
from relay.settings import Settings

log = logging.getLogger("relay.jobs.reminders")


def _queue_one(session: Session, due: DueReminder, settings: Settings) -> int:
    """Mark one reminder sent and queue its emails, in the caller's transaction. Returns how
    many emails were queued (0 when the reminder changed meanwhile or nobody wants it)."""
    if not mark_revalidation_reminder_sent(session, due.org_id, due.dataset_id, due.reminder_date):
        return 0
    ds = session.scalars(
        select(Dataset).where(Dataset.id == due.dataset_id, Dataset.org_id == due.org_id)
    ).one()
    org_name = session.scalars(select(Organisation.name).where(Organisation.id == due.org_id)).one()
    link = f"{settings.web_base_url}/orgs/{due.org_id}/datasets/{due.dataset_id}"
    subject, text, html = revalidation_reminder_email(
        org_name, ds.title, due.reminder_date, ds.last_validated_at, link
    )
    queued = 0
    for person in reminder_recipients(session, due.org_id, due.recipient_id):
        if is_enabled(session, person.id, NotificationKind.REVALIDATION_REMINDER):
            enqueue(session, person.email, subject, text, html)
            queued += 1
    if not queued:
        log.info("reminder for dataset %s has no recipients who want it", due.dataset_id)
    return queued


def queue_revalidation_reminders(
    sessions: sessionmaker[Session], settings: Settings, today: date | None = None
) -> int:
    """Queue one email per recipient for every published dataset whose reminder is due, and
    mark those reminders sent. Returns how many emails were queued.

    Each reminder has its own transaction, so the mark and its emails are saved together or
    not at all, and a re-run finds nothing. Drafts are left alone (and unmarked) until they are
    published.
    """
    with sessions() as session:
        due = due_revalidation_reminders(session, today)
    queued = 0
    for item in due:
        if item.status != DatasetStatus.PUBLISHED:
            continue
        with sessions() as session:
            set_tenant(session, item.org_id)
            queued += _queue_one(session, item, settings)
            session.commit()
    return queued
