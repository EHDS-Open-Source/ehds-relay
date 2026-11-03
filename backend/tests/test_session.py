from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select, update
from sqlalchemy.orm import Session, sessionmaker

from relay.auth.csrf import CSRF_HEADER
from relay.auth.sessions import hash_token
from relay.domain.users import AppUser, UserSession
from relay.settings import get_settings


def _sessions(db: sessionmaker[Session]) -> list[UserSession]:
    with db() as s:
        return list(s.scalars(select(UserSession)).all())


def test_me_requires_session(anon_client: TestClient) -> None:
    assert anon_client.get("/api/v1/me").status_code == 401


def test_me_returns_user(client: TestClient, user: AppUser) -> None:
    res = client.get("/api/v1/me")
    assert res.status_code == 200
    assert res.json() == {"id": str(user.id), "name": "Olive Owner", "email": "owner@example.org"}


def test_unknown_cookie_401(anon_client: TestClient) -> None:
    anon_client.cookies.set(get_settings().session_cookie_name, "not-a-session")
    assert anon_client.get("/api/v1/me").status_code == 401


def test_auth_9_session_idle_expiry(
    client: TestClient, db: sessionmaker[Session], user: AppUser
) -> None:
    idle = timedelta(minutes=get_settings().session_idle_minutes)
    with db() as s:
        s.execute(update(UserSession).values(last_seen_at=datetime.now(UTC) - idle))
        s.commit()
    assert client.get("/api/v1/me").status_code == 401
    assert _sessions(db) == []


def test_session_absolute_expiry(client: TestClient, db: sessionmaker[Session]) -> None:
    with db() as s:
        s.execute(update(UserSession).values(expires_at=datetime.now(UTC) - timedelta(seconds=1)))
        s.commit()
    assert client.get("/api/v1/me").status_code == 401
    assert _sessions(db) == []


def test_activity_extends_idle_timeout(client: TestClient, db: sessionmaker[Session]) -> None:
    almost_idle = timedelta(minutes=get_settings().session_idle_minutes - 1)
    with db() as s:
        s.execute(update(UserSession).values(last_seen_at=datetime.now(UTC) - almost_idle))
        s.commit()
    assert client.get("/api/v1/me").status_code == 200
    [row] = _sessions(db)
    assert datetime.now(UTC) - row.last_seen_at < timedelta(minutes=1)


def test_cookie_holds_token_not_hash(client: TestClient, db: sessionmaker[Session]) -> None:
    token = client.cookies[get_settings().session_cookie_name]
    [row] = _sessions(db)
    assert row.id_hash == hash_token(token)
    assert row.id_hash != token


def test_csrf_header_required_on_unsafe_methods(client: TestClient) -> None:
    body = {"name": "Acme"}
    del client.headers[CSRF_HEADER]
    res = client.post("/api/v1/organisations", json=body)
    assert res.status_code == 403
    # GET is never blocked
    assert client.get("/api/v1/me").status_code == 200
    # A wrong value does not count
    res = client.post("/api/v1/organisations", json=body, headers={CSRF_HEADER: "evil"})
    assert res.status_code == 403
    # Checked before the session, so an anonymous forged request learns nothing either
    client.cookies.clear()
    assert client.post("/api/v1/organisations", json=body).status_code == 403


def test_csrf_header_accepted(client: TestClient) -> None:
    assert client.post("/api/v1/organisations", json={"name": "Acme", "country": "NL"}).status_code == 201
