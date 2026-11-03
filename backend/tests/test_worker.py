from typing import Any

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from relay import worker
from relay.domain.email_outbox import EmailOutbox
from relay.email.outbox import enqueue
from relay.jobs.email import send_pending_emails
from relay.settings import Settings

URL = "postgresql+psycopg2://relay:secret@db.internal:5432/relay"
DSN = "postgresql://relay:secret@db.internal:5432/relay"


def _app(url: str = URL) -> Any:
    # Procrastinate's generics leave its task types partly unknown to the type checker
    return worker.build_app(Settings(database_url=url))


def test_database_dsn_drops_driver() -> None:
    assert Settings(database_url=URL).database_dsn == DSN


def test_app_registers_periodic_email_task() -> None:
    app = _app()
    assert "send_pending_emails" in app.tasks
    periodic = [(pt.task.name, pt.cron) for pt in app.periodic_registry.periodic_tasks.values()]
    assert periodic == [("send_pending_emails", worker.EMAIL_CRON)]


def test_app_connects_with_settings_dsn() -> None:
    assert vars(_app().connector)["_pool_args"]["conninfo"] == DSN


def test_migrations_install_job_queue_schema(database_url: str) -> None:
    app = _app(database_url)
    with app.open():
        assert app.check_connection()


class _AppWithoutSchema:
    def open(self) -> "_AppWithoutSchema":
        return self

    def __enter__(self) -> "_AppWithoutSchema":
        return self

    def __exit__(self, *args: object) -> None:
        return None

    def check_connection(self) -> bool:
        return False

    def run_worker(self, **kwargs: object) -> None:
        raise AssertionError("must not start")


def test_wait_for_schema_retries_then_gives_up() -> None:
    assert worker.wait_for_schema(_AppWithoutSchema(), attempts=3, delay=0) is False  # pyright: ignore[reportArgumentType]


class _UnreachableApp(_AppWithoutSchema):
    def open(self) -> "_AppWithoutSchema":
        raise OSError("connection refused")


def test_wait_for_schema_survives_unreachable_database() -> None:
    assert worker.wait_for_schema(_UnreachableApp(), attempts=2, delay=0) is False  # pyright: ignore[reportArgumentType]


def test_main_exits_when_schema_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    def build(settings: Settings) -> _AppWithoutSchema:
        return _AppWithoutSchema()

    monkeypatch.setattr(worker, "build_app", build)
    monkeypatch.setattr(worker, "SCHEMA_WAIT_SECONDS", 0)
    monkeypatch.setattr(worker, "SCHEMA_WAIT_ATTEMPTS", 2)
    with pytest.raises(SystemExit) as exc:
        worker.main()
    assert exc.value.code == 1


def test_periodic_task_drains_outbox(
    db: sessionmaker[Session], monkeypatch: pytest.MonkeyPatch
) -> None:
    sent: list[str] = []

    def drain(sessions: sessionmaker[Session], settings: Settings) -> int:
        return send_pending_emails(
            sessions, settings, sender=lambda row, _settings: sent.append(row.to_address)
        )

    monkeypatch.setattr(worker, "get_sessionmaker", lambda: db)
    monkeypatch.setattr(worker, "send_pending_emails", drain)
    with db() as session:
        enqueue(session, "ada@example.org", "Hi", "text", "<p>html</p>")
        session.commit()

    _app().tasks["send_pending_emails"](timestamp=0)

    assert sent == ["ada@example.org"]
    with db() as session:
        assert session.scalars(select(EmailOutbox)).one().sent_at is not None
