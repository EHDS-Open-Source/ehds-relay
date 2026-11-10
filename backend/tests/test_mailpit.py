"""The real SMTP sender against a Mailpit container, as used in development."""

from collections.abc import Iterator
from datetime import UTC, date, datetime

import pytest
import requests
from testcontainers.core.container import DockerContainer
from testcontainers.core.wait_strategies import HttpWaitStrategy

from relay.domain.email_outbox import EmailOutbox
from relay.email import smtp
from relay.email.messages import invitation_email, revalidation_reminder_email
from relay.settings import Settings


@pytest.fixture(scope="module")
def mailpit() -> Iterator[tuple[Settings, str]]:
    # Same image as the dev chart
    container = (
        DockerContainer("axllent/mailpit:v1.33.0")
        .with_exposed_ports(1025, 8025)
        .waiting_for(HttpWaitStrategy(8025, "/livez"))
    )
    with container:
        host = container.get_container_host_ip()
        settings = Settings(
            smtp_host=host,
            smtp_port=int(container.get_exposed_port(1025)),
            smtp_from="relay@example.org",
        )
        yield settings, f"http://{host}:{container.get_exposed_port(8025)}"


def test_invitation_email_arrives_in_mailpit(mailpit: tuple[Settings, str]) -> None:
    settings, api = mailpit
    link = "http://localhost:5173/invitations/tok-123"
    subject, text, html = invitation_email(
        "Acme Hospital",
        "Olive Owner",
        "standard",
        link,
        datetime(2026, 12, 3, tzinfo=UTC),
        invitee_name="Ines Invitee",
        message="Welcome to the team",
    )
    row = EmailOutbox(
        to_address="invitee@example.org", subject=subject, text_body=text, html_body=html
    )

    smtp.send(row, settings)

    messages = requests.get(f"{api}/api/v1/messages", timeout=10).json()["messages"]
    assert [m["Subject"] for m in messages] == [subject]
    assert messages[0]["To"][0]["Address"] == "invitee@example.org"
    full = requests.get(f"{api}/api/v1/message/{messages[0]['ID']}", timeout=10).json()
    assert link in full["Text"]
    assert link in full["HTML"]
    assert "Acme Hospital" in full["Text"]
    assert "Olive Owner" in full["Text"]
    assert "Ines Invitee" in full["Text"]
    assert "Welcome to the team" in full["HTML"]


def test_reminder_email_arrives_in_mailpit(mailpit: tuple[Settings, str]) -> None:
    settings, api = mailpit
    requests.delete(f"{api}/api/v1/messages", timeout=10)
    link = "http://localhost:5173/orgs/o1/datasets/d1"
    subject, text, html = revalidation_reminder_email(
        "Acme Hospital", "Cancer registry", date(2026, 11, 3), None, link
    )
    row = EmailOutbox(
        to_address="owner@example.org", subject=subject, text_body=text, html_body=html
    )

    smtp.send(row, settings)

    messages = requests.get(f"{api}/api/v1/messages", timeout=10).json()["messages"]
    assert [m["Subject"] for m in messages] == [subject]
    full = requests.get(f"{api}/api/v1/message/{messages[0]['ID']}", timeout=10).json()
    for part in (full["Text"], full["HTML"]):
        assert link in part
        assert "Acme Hospital" in part
        assert "Cancer registry" in part
