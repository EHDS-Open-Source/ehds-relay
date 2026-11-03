from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from relay.app import create_app
from relay.settings import get_settings


@pytest.fixture(autouse=True)
def _clear_settings_cache() -> Iterator[None]:  # pyright: ignore[reportUnusedFunction]
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def preflight(origin: str) -> dict[str, str]:
    with TestClient(create_app()) as c:
        res = c.options(
            "/api/v1/organisations",
            headers={"Origin": origin, "Access-Control-Request-Method": "POST"},
        )
    return dict(res.headers)


def test_cors_disabled_by_default() -> None:
    assert "access-control-allow-origin" not in preflight("http://localhost:5173")


def test_cors_allows_configured_origin(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("RELAY_CORS_ORIGINS", '["http://localhost:5173"]')
    headers = preflight("http://localhost:5173")
    assert headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "access-control-allow-origin" not in preflight("http://evil.example")
