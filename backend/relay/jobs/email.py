"""Draining the email outbox. Called by the worker's periodic task; tests call it directly."""

import logging
from collections.abc import Callable
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from relay.domain.email_outbox import EmailOutbox
from relay.email import smtp
from relay.settings import Settings

log = logging.getLogger("relay.jobs.email")

Sender = Callable[[EmailOutbox, Settings], None]

# First retry after this long, doubling with each failed attempt
RETRY_BASE = timedelta(seconds=30)
BATCH_SIZE = 50


def retry_delay(attempts: int) -> timedelta:
    return RETRY_BASE * (2 ** (attempts - 1))


def _claim_next(session: Session, settings: Settings) -> EmailOutbox | None:
    """Lock one due email. Rows locked by another worker are skipped, not waited for."""
    stmt = (
        select(EmailOutbox)
        .where(
            EmailOutbox.sent_at.is_(None),
            EmailOutbox.next_attempt_at <= datetime.now(UTC),
            EmailOutbox.attempts < settings.email_max_attempts,
        )
        .order_by(EmailOutbox.next_attempt_at, EmailOutbox.id)
        .limit(1)
        .with_for_update(skip_locked=True)
    )
    return session.scalars(stmt).one_or_none()


def send_pending_emails(
    sessions: sessionmaker[Session],
    settings: Settings,
    sender: Sender = smtp.send,
    limit: int = BATCH_SIZE,
) -> int:
    """Send up to `limit` due emails, one transaction each. Returns how many were sent.

    Delivery is at least once: if the worker dies between sending and committing, the email is
    sent again on the next run.
    """
    sent = 0
    for _ in range(limit):
        with sessions() as session:
            row = _claim_next(session, settings)
            if row is None:
                break
            try:
                sender(row, settings)
            except Exception as exc:
                row.attempts += 1
                row.last_error = f"{type(exc).__name__}: {exc}"[:1000]
                row.next_attempt_at = datetime.now(UTC) + retry_delay(row.attempts)
                if row.attempts >= settings.email_max_attempts:
                    log.error("giving up on email %s after %s attempts", row.id, row.attempts)
                else:
                    log.warning("email %s failed (attempt %s): %s", row.id, row.attempts, exc)
            else:
                row.sent_at = datetime.now(UTC)
                row.text_body = None
                row.html_body = None
                sent += 1
            session.commit()
    return sent
