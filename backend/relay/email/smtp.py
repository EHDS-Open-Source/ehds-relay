import smtplib
from email.message import EmailMessage

from relay.domain.email_outbox import EmailOutbox
from relay.settings import Settings

TIMEOUT_SECONDS = 30


def build_message(row: EmailOutbox, sender: str) -> EmailMessage:
    # The default policy refuses header values containing line breaks, so a crafted subject or
    # address cannot add headers.
    msg = EmailMessage()
    msg["From"] = sender
    msg["To"] = row.to_address
    msg["Subject"] = row.subject
    msg.set_content(row.text_body or "")
    if row.html_body:
        msg.add_alternative(row.html_body, subtype="html")
    return msg


def send(row: EmailOutbox, settings: Settings) -> None:
    """Deliver one email over SMTP (Mailpit in development). Raises on failure."""
    msg = build_message(row, settings.smtp_from)
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=TIMEOUT_SECONDS) as smtp:
        smtp.send_message(msg)
