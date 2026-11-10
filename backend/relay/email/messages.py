"""Email content. Plain functions for now; templates and translations can replace them later."""

from datetime import date, datetime
from html import escape

ROLE_LABELS = {"owner": "Owner", "standard": "Standard member"}


def invitation_email(
    org_name: str, inviter_name: str | None, role: str, link: str, expires_at: datetime
) -> tuple[str, str, str]:
    """Subject, plain-text body and HTML body of an invitation."""
    inviter = inviter_name or "An owner"
    role_label = ROLE_LABELS.get(role, role)
    expires = expires_at.strftime("%d %B %Y")
    # Collapse whitespace: a line break in a name must not end up in the Subject header
    subject = " ".join(f"{inviter} invited you to join {org_name} on EHDS Relay".split())
    text = (
        f"{inviter} invited you to join {org_name} on EHDS Relay as {role_label}.\n"
        "\n"
        f"Accept the invitation: {link}\n"
        "\n"
        f"The link works until {expires}. If you were not expecting this email, you can "
        "ignore it.\n"
    )
    html = (
        "<!doctype html>\n"
        '<html><body style="font-family: sans-serif; line-height: 1.5">\n'
        f"<p>{escape(inviter)} invited you to join <strong>{escape(org_name)}</strong> on "
        f"EHDS Relay as {escape(role_label)}.</p>\n"
        f'<p><a href="{escape(link)}">Accept the invitation</a></p>\n'
        f"<p>Or open this link: {escape(link)}</p>\n"
        f"<p>The link works until {escape(expires)}. If you were not expecting this email, "
        "you can ignore it.</p>\n"
        "</body></html>\n"
    )
    return subject, text, html


def revalidation_reminder_email(
    org_name: str,
    dataset_title: str | None,
    reminder_date: date,
    last_validated_at: datetime | None,
    link: str,
) -> tuple[str, str, str]:
    """Subject, plain-text body and HTML body of a dataset revalidation reminder."""
    title = dataset_title or "Untitled dataset"
    when = reminder_date.strftime("%d %B %Y")
    validated = last_validated_at.strftime("%d %B %Y") if last_validated_at else None
    # Collapse whitespace: a line break in a title must not end up in the Subject header
    subject = " ".join(f"Time to re-check your dataset: {title}".split())
    validated_text = f"It was last validated on {validated}.\n" if validated else ""
    text = (
        f'You asked to be reminded on {when} to check that the dataset "{title}" of '
        f"{org_name} is still valid.\n"
        f"{validated_text}"
        "\n"
        f"Open the dataset: {link}\n"
        "\n"
        "Once you have checked it, confirm it on the dataset page.\n"
    )
    validated_html = f"<p>It was last validated on {escape(validated)}.</p>\n" if validated else ""
    html = (
        "<!doctype html>\n"
        '<html><body style="font-family: sans-serif; line-height: 1.5">\n'
        f"<p>You asked to be reminded on {escape(when)} to check that the dataset "
        f"<strong>{escape(title)}</strong> of {escape(org_name)} is still valid.</p>\n"
        f"{validated_html}"
        f'<p><a href="{escape(link)}">Open the dataset</a></p>\n'
        f"<p>Or open this link: {escape(link)}</p>\n"
        "<p>Once you have checked it, confirm it on the dataset page.</p>\n"
        "</body></html>\n"
    )
    return subject, text, html
