from sqlalchemy.orm import Session

from relay.domain.email_outbox import EmailOutbox


def enqueue(session: Session, to: str, subject: str, text: str, html: str) -> EmailOutbox:
    """Queue an email in the caller's transaction; the worker sends it once that commits."""
    row = EmailOutbox(to_address=to, subject=subject, text_body=text, html_body=html)
    session.add(row)
    return row
