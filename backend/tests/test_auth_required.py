"""Every API route needs a session unless it is deliberately public."""

import re
from typing import Any

import pytest
from fastapi.testclient import TestClient

from relay.app import create_app
from relay.auth.csrf import CSRF_HEADER, CSRF_HEADER_VALUE

# Reachable without signing in. Keep this list short and explicit.
PUBLIC: set[tuple[str, str]] = {
    ("get", "/api/v1/auth/login"),
    ("get", "/api/v1/auth/callback"),
    ("post", "/api/v1/auth/logout"),
    ("get", "/api/v1/invitations/{token}"),
    ("get", "/api/v1/capabilities"),
}


def _operations() -> list[tuple[str, str]]:
    paths: dict[str, dict[str, Any]] = create_app().openapi()["paths"]
    return [
        (method, path)
        for path, ops in paths.items()
        if path.startswith("/api/v1")
        for method in ops
    ]


PROTECTED = [op for op in _operations() if op not in PUBLIC]


@pytest.fixture(scope="module")
def anon() -> TestClient:
    # No database: without a cookie the check fails before any query
    return TestClient(
        create_app(), headers={CSRF_HEADER: CSRF_HEADER_VALUE}, follow_redirects=False
    )


def test_public_list_matches_real_routes() -> None:
    assert sorted(PUBLIC - set(_operations())) == []


@pytest.mark.parametrize(
    ("method", "path"), PROTECTED, ids=[f"{m.upper()} {p}" for m, p in PROTECTED]
)
def test_every_protected_route_requires_session(anon: TestClient, method: str, path: str) -> None:
    # Any value fits the path parameters (all ids are UUIDs, tokens are strings). No body:
    # the session check must reject the request before the body is validated.
    url = re.sub(r"\{[^}]+\}", "00000000-0000-4000-8000-000000000000", path)
    res = anon.request(method, url)
    assert res.status_code == 401, res.text
