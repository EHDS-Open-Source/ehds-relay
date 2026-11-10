"""Email content. Plain functions for now; templates and translations can replace them later."""

from datetime import datetime
from html import escape

ROLE_LABELS = {"owner": "Owner", "standard": "Standard member"}


def _html_paragraph(text: str) -> str:
    """Escaped text with line breaks kept."""
    return escape(text).replace("\n", "<br>\n")


def invitation_email(
    org_name: str,
    inviter_name: str | None,
    role: str,
    link: str,
    expires_at: datetime,
    invitee_name: str | None = None,
    message: str | None = None,
) -> tuple[str, str, str]:
    """Subject, plain-text body and HTML body of an invitation.

    The invitee's name and the sender's message go in the body only, never the Subject.
    """
    inviter = inviter_name or "An owner"
    role_label = ROLE_LABELS.get(role, role)
    expires = expires_at.strftime("%d %B %Y")
    # Collapse whitespace: a line break in a name must not end up in the Subject header
    subject = " ".join(f"{inviter} invited you to join {org_name} on EHDS Relay".split())
    greeting = f"Hi {invitee_name}," if invitee_name else "Hello,"
    text_message = f"Message from {inviter}:\n{message}\n\n" if message else ""
    html_message = (
        f"<p>Message from {escape(inviter)}:</p>\n"
        '<blockquote style="margin: 0 0 1em; padding-left: 1em; border-left: 3px solid #ccc">'
        f"{_html_paragraph(message)}</blockquote>\n"
        if message
        else ""
    )
    text = (
        f"{greeting}\n"
        "\n"
        f"{inviter} invited you to join {org_name} on EHDS Relay as {role_label}.\n"
        "\n"
        f"{text_message}"
        f"Accept the invitation: {link}\n"
        "\n"
        f"The link works until {expires}. If you were not expecting this email, you can "
        "ignore it.\n"
    )
    html = (
        "<!doctype html>\n"
        '<html><body style="font-family: sans-serif; line-height: 1.5">\n'
        f"<p>{escape(greeting)}</p>\n"
        f"<p>{escape(inviter)} invited you to join <strong>{escape(org_name)}</strong> on "
        f"EHDS Relay as {escape(role_label)}.</p>\n"
        f"{html_message}"
        f'<p><a href="{escape(link)}">Accept the invitation</a></p>\n'
        f"<p>Or open this link: {escape(link)}</p>\n"
        f"<p>The link works until {escape(expires)}. If you were not expecting this email, "
        "you can ignore it.</p>\n"
        "</body></html>\n"
    )
    return subject, text, html
