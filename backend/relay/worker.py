"""Background worker.

Runs next to the API from the same image: `python -m relay.worker`.

Jobs run on Procrastinate, which keeps its queue in the application's Postgres database (its
schema is installed by the Alembic migrations). The API never talks to Procrastinate: it writes
rows (such as the email outbox) in its own transactions, and periodic tasks here pick them up.
Procrastinate makes sure each periodic run happens on one worker only, however many are running.
"""

import logging
import sys

from procrastinate import App, PsycopgConnector

from relay.db import get_sessionmaker
from relay.jobs.email import send_pending_emails
from relay.settings import Settings, get_settings

log = logging.getLogger("relay.worker")

# Every 10 seconds (the sixth cron field is seconds)
EMAIL_CRON = "* * * * * */10"


def build_app(settings: Settings) -> App:
    app = App(connector=PsycopgConnector(conninfo=settings.database_dsn))

    @app.periodic(cron=EMAIL_CRON, periodic_id="send_pending_emails")
    @app.task(name="send_pending_emails", queue="email", pass_context=False)
    def send_pending_emails_task(timestamp: int) -> None:  # pyright: ignore[reportUnusedFunction]
        sent = send_pending_emails(get_sessionmaker(), get_settings())
        if sent:
            log.info("sent %s email(s)", sent)

    return app


def main() -> None:
    settings = get_settings()
    logging.basicConfig(level=settings.log_level.upper())
    app = build_app(settings)
    with app.open():
        # The API pod's init container runs the migrations; until it has, exit so the
        # orchestrator restarts the worker later.
        if not app.check_connection():
            log.error("job queue schema is missing; run the database migrations first")
            sys.exit(1)
    log.info("worker started (smtp=%s:%s)", settings.smtp_host, settings.smtp_port)
    app.run_worker(install_signal_handlers=True)


if __name__ == "__main__":
    main()
