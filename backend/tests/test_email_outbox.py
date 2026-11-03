import threading
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.orm import Session, sessionmaker

from relay.domain.email_outbox import EmailOutbox
from relay.email.outbox import enqueue
from relay.email.smtp import build_message
from relay.jobs.email import retry_delay, send_pending_emails
from relay.settings import Settings, get_settings


def _queue(db: sessionmaker[Session], count: int = 1) -> None:
    with db() as session:
        for i in range(count):
            enqueue(session, f"user{i}@example.org", f"Subject {i}", "text", "<p>html</p>")
        session.commit()


def _rows(db: sessionmaker[Session]) -> list[EmailOutbox]:
    with db() as session:
        return list(session.scalars(select(EmailOutbox).order_by(EmailOutbox.to_address)))


def test_sends_and_clears_bodies(db: sessionmaker[Session]) -> None:
    _queue(db, 2)
    sent: list[str] = []

    count = send_pending_emails(
        db, get_settings(), sender=lambda row, _s: sent.append(row.to_address)
    )

    assert count == 2
    assert sorted(sent) == ["user0@example.org", "user1@example.org"]
    for row in _rows(db):
        assert row.sent_at is not None
        assert row.text_body is None
        assert row.html_body is None
    # Nothing left to send
    assert send_pending_emails(db, get_settings(), sender=lambda row, _s: sent.append("x")) == 0


def test_failure_backs_off_and_gives_up(db: sessionmaker[Session]) -> None:
    _queue(db)
    settings = Settings(email_max_attempts=3)

    def fail(row: EmailOutbox, _s: Settings) -> None:
        raise ConnectionRefusedError("smtp down")

    before = datetime.now(UTC)
    assert send_pending_emails(db, settings, sender=fail) == 0
    (row,) = _rows(db)
    assert row.attempts == 1
    assert row.sent_at is None
    assert row.last_error is not None and "smtp down" in row.last_error
    assert row.next_attempt_at >= before + retry_delay(1)
    assert row.text_body == "text"  # kept for the retry

    # Not due yet: nothing is attempted
    assert send_pending_emails(db, settings, sender=fail) == 0
    assert _rows(db)[0].attempts == 1

    # Make it due again until the limit is reached
    for expected in (2, 3):
        with db() as session:
            session.execute(update(EmailOutbox).values(next_attempt_at=datetime.now(UTC)))
            session.commit()
        send_pending_emails(db, settings, sender=fail)
        assert _rows(db)[0].attempts == expected

    with db() as session:
        session.execute(update(EmailOutbox).values(next_attempt_at=datetime.now(UTC)))
        session.commit()
    calls: list[str] = []
    assert send_pending_emails(db, settings, sender=lambda r, _s: calls.append("x")) == 0
    assert calls == []


def test_retry_delay_doubles() -> None:
    assert retry_delay(1) == timedelta(seconds=30)
    assert retry_delay(2) == timedelta(seconds=60)
    assert retry_delay(3) == timedelta(seconds=120)


def test_concurrent_drains_send_each_email_once(db: sessionmaker[Session]) -> None:
    _queue(db, 10)
    sent: list[str] = []
    lock = threading.Lock()
    barrier = threading.Barrier(2)

    def slow_send(row: EmailOutbox, _s: Settings) -> None:
        with lock:
            sent.append(row.to_address)
        threading.Event().wait(0.02)

    def drain() -> None:
        barrier.wait()
        send_pending_emails(db, get_settings(), sender=slow_send)

    threads = [threading.Thread(target=drain) for _ in range(2)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert sorted(sent) == sorted(f"user{i}@example.org" for i in range(10))
    assert all(row.sent_at is not None for row in _rows(db))


def test_message_has_text_and_html_parts() -> None:
    row = EmailOutbox(
        to_address="ada@example.org", subject="Hello", text_body="plain", html_body="<p>rich</p>"
    )
    msg = build_message(row, "relay@example.org")
    assert msg["To"] == "ada@example.org"
    assert msg["From"] == "relay@example.org"
    assert msg.get_content_type() == "multipart/alternative"
    parts = [p.get_content_type() for p in msg.iter_parts()]
    assert parts == ["text/plain", "text/html"]
