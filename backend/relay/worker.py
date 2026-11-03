"""Background worker.

Runs next to the API from the same image: `python -m relay.worker`.

Placeholder: there is no job queue yet, so for now it logs how it is configured and idles until
it is told to stop. It exists so the deployment, logging, database and mail settings, and the
live-reload loop are in place when the real job runner and the email sender replace `run`.
"""

import logging
import signal
import threading
from types import FrameType

from relay.settings import get_settings

log = logging.getLogger("relay.worker")

HEARTBEAT_SECONDS = 60.0


def run(stop: threading.Event, heartbeat_seconds: float = HEARTBEAT_SECONDS) -> None:
    """Idle until `stop` is set, logging a heartbeat so a live worker is visible in the logs."""
    settings = get_settings()
    log.info(
        "worker started: no jobs registered yet (smtp=%s:%s, from=%s)",
        settings.smtp_host,
        settings.smtp_port,
        settings.smtp_from,
    )
    while not stop.wait(heartbeat_seconds):
        log.info("worker alive, no jobs registered")
    log.info("worker stopping")


def main() -> None:
    logging.basicConfig(level=get_settings().log_level.upper())
    stop = threading.Event()

    def handle_signal(signum: int, frame: FrameType | None) -> None:
        stop.set()

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)
    run(stop)


if __name__ == "__main__":
    main()
