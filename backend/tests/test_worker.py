import logging
import threading

import pytest

from relay import worker


def test_worker_logs_config_and_stops_on_signal(caplog: pytest.LogCaptureFixture) -> None:
    stop = threading.Event()
    stop.set()
    with caplog.at_level(logging.INFO, logger="relay.worker"):
        worker.run(stop)
    assert "worker started" in caplog.text
    assert "worker stopping" in caplog.text


def test_worker_heartbeats_until_stopped(caplog: pytest.LogCaptureFixture) -> None:
    stop = threading.Event()
    timer = threading.Timer(0.2, stop.set)
    timer.start()
    with caplog.at_level(logging.INFO, logger="relay.worker"):
        worker.run(stop, heartbeat_seconds=0.01)
    assert "worker alive" in caplog.text
