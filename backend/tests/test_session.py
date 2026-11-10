from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import parse_qs, urlsplit

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from httpx2 import Response
from sqlalchemy import select, update
from sqlalchemy.orm import Session, sessionmaker

from relay.auth.csrf import CSRF_HEADER
from relay.auth.oidc import get_oidc_client
from relay.auth.sessions import hash_token
from relay.domain.users import AppUser, UserSession
from relay.settings import get_settings
from tests.conftest import AddMember, AsUser, MakeUser
from tests.fake_oidc import AUTHORIZATION_ENDPOINT, END_SESSION_ENDPOINT, FAKE_ISSUER, FakeOIDC


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
    res = client.post("/api/v1/organisations", json={"name": "Acme", "country": "NL"})
    assert res.status_code == 201


# Sign-in flow, against an in-process identity provider


@pytest.fixture
def fake_oidc(app: FastAPI) -> FakeOIDC:
    fake = FakeOIDC()
    app.dependency_overrides[get_oidc_client] = lambda: fake
    return fake


def _query(url: str) -> dict[str, str]:
    return {k: v[0] for k, v in parse_qs(urlsplit(url).query).items()}


def _set_cookies(res: Response) -> dict[str, str]:
    """Set-Cookie headers by cookie name, as raw header values."""
    return {h.split("=", 1)[0]: h for h in res.headers.get_list("set-cookie")}


def _login(client: TestClient, **params: Any) -> str:
    res = client.get("/api/v1/auth/login", params=params)
    assert res.status_code == 302, res.text
    return res.headers["location"]


def _sign_in_via_provider(
    client: TestClient, fake: FakeOIDC, redirect: str | None = None, **claims: Any
) -> Response:
    location = _login(client, **({"redirect": redirect} if redirect else {}))
    code = fake.authorize(location, **claims)
    return client.get(
        "/api/v1/auth/callback", params={"code": code, "state": _query(location)["state"]}
    )


def _users(db: sessionmaker[Session]) -> list[AppUser]:
    with db() as s:
        return list(s.scalars(select(AppUser)).all())


def test_auth_1_login_redirects_to_provider(anon_client: TestClient, fake_oidc: FakeOIDC) -> None:
    res = anon_client.get("/api/v1/auth/login", params={"redirect": "/orgs"})
    assert res.status_code == 302
    location = res.headers["location"]
    assert location.startswith(AUTHORIZATION_ENDPOINT + "?")
    q = _query(location)
    settings = get_settings()
    assert q["response_type"] == "code"
    assert q["client_id"] == settings.oidc_client_id
    assert q["redirect_uri"] == f"{settings.web_base_url}/api/v1/auth/callback"
    assert q["scope"] == settings.oidc_scopes
    assert q["code_challenge_method"] == "S256"
    assert q["state"] and q["nonce"] and q["code_challenge"]
    assert "prompt" not in q
    cookie = _set_cookies(res)[f"{settings.session_cookie_name}_login"]
    assert "HttpOnly" in cookie
    assert "Path=/api/v1/auth" in cookie
    assert "Max-Age=600" in cookie
    assert "samesite=lax" in cookie.lower()
    # Nothing secret ends up in the URL: the verifier stays in the cookie
    assert q["code_challenge"] not in cookie


def test_login_signup_opens_registration(anon_client: TestClient, fake_oidc: FakeOIDC) -> None:
    assert _query(_login(anon_client, signup="true"))["prompt"] == "create"


def test_login_change_password_asks_for_current_password_first(
    anon_client: TestClient, fake_oidc: FakeOIDC
) -> None:
    q = _query(_login(anon_client, action="change_password", redirect="/account"))
    assert q["kc_action"] == "UPDATE_PASSWORD"
    assert q["prompt"] == "login"


@pytest.mark.parametrize(
    "params",
    [{"action": "change_password", "signup": "true"}, {"action": "delete_account"}],
    ids=["with signup", "unknown action"],
)
def test_login_rejects_bad_action(
    anon_client: TestClient, fake_oidc: FakeOIDC, params: dict[str, str]
) -> None:
    res = anon_client.get("/api/v1/auth/login", params=params)
    assert res.status_code == 422


def test_login_without_action_sends_no_kc_action(
    anon_client: TestClient, fake_oidc: FakeOIDC
) -> None:
    for q in (_query(_login(anon_client)), _query(_login(anon_client, signup="true"))):
        assert "kc_action" not in q


@pytest.mark.parametrize(
    ("redirect", "kc_action_status", "expected"),
    [
        ("/account", "success", "/account?password=success"),
        ("/account", "cancelled", "/account?password=cancelled"),
        ("/account", "error", "/account?password=error"),
        ("/account?tab=1", "success", "/account?tab=1&password=success"),
        ("/account#pw", "success", "/account?password=success#pw"),
        ("/account", "bogus", "/account"),
        ("/account", "https://evil.test", "/account"),
    ],
)
def test_callback_passes_on_action_status(
    anon_client: TestClient,
    fake_oidc: FakeOIDC,
    redirect: str,
    kc_action_status: str,
    expected: str,
) -> None:
    location = _login(anon_client, action="change_password", redirect=redirect)
    code = fake_oidc.authorize(location)
    res = anon_client.get(
        "/api/v1/auth/callback",
        params={
            "code": code,
            "state": _query(location)["state"],
            "kc_action_status": kc_action_status,
        },
    )
    assert res.status_code == 302
    assert res.headers["location"] == f"{get_settings().web_base_url}{expected}"
    assert get_settings().session_cookie_name in _set_cookies(res)


def test_login_state_is_fresh_each_time(anon_client: TestClient, fake_oidc: FakeOIDC) -> None:
    a, b = _query(_login(anon_client)), _query(_login(anon_client))
    assert a["state"] != b["state"] and a["nonce"] != b["nonce"]


def test_auth_1_callback_creates_user_and_session(
    anon_client: TestClient, fake_oidc: FakeOIDC, db: sessionmaker[Session]
) -> None:
    res = _sign_in_via_provider(anon_client, fake_oidc, redirect="/orgs?tab=1")
    settings = get_settings()
    assert res.status_code == 302
    assert res.headers["location"] == f"{settings.web_base_url}/orgs?tab=1"

    [user] = _users(db)
    assert (user.oidc_issuer, user.oidc_subject) == (FAKE_ISSUER, "subject-owner")
    assert (user.email, user.name) == ("owner@example.org", "Olive Owner")
    [row] = _sessions(db)
    assert row.user_id == user.id
    assert row.id_token  # kept as the sign-out hint

    cookies = _set_cookies(res)
    session_cookie = cookies[settings.session_cookie_name]
    assert "HttpOnly" in session_cookie
    assert "Path=/;" in session_cookie or session_cookie.endswith("Path=/")
    assert "samesite=lax" in session_cookie.lower()
    assert f"Max-Age={settings.session_max_hours * 3600}" in session_cookie
    assert "Secure" not in session_cookie  # web_url is http in tests
    # The login cookie is spent
    assert "Max-Age=0" in cookies[f"{settings.session_cookie_name}_login"]

    me = anon_client.get("/api/v1/me")
    assert me.status_code == 200
    assert me.json()["email"] == "owner@example.org"


def test_callback_defaults_to_root(anon_client: TestClient, fake_oidc: FakeOIDC) -> None:
    res = _sign_in_via_provider(anon_client, fake_oidc)
    assert res.headers["location"] == f"{get_settings().web_base_url}/"


def test_callback_updates_existing_user_claims(
    anon_client: TestClient, fake_oidc: FakeOIDC, make_user: MakeUser, db: sessionmaker[Session]
) -> None:
    existing = make_user(email="old@example.org", name="Old Name")
    res = _sign_in_via_provider(
        anon_client, fake_oidc, sub=existing.oidc_subject, email="new@example.org", name="New Name"
    )
    assert res.status_code == 302
    [user] = _users(db)
    assert user.id == existing.id
    assert (user.email, user.name) == ("new@example.org", "New Name")
    assert user.last_login_at > existing.last_login_at


def test_callback_name_falls_back(
    anon_client: TestClient, fake_oidc: FakeOIDC, db: sessionmaker[Session]
) -> None:
    _sign_in_via_provider(anon_client, fake_oidc, name=None, preferred_username="olive")
    [user] = _users(db)
    assert user.name == "olive"


def test_callback_replaces_existing_session(
    client: TestClient, fake_oidc: FakeOIDC, db: sessionmaker[Session]
) -> None:
    old = client.cookies[get_settings().session_cookie_name]
    _sign_in_via_provider(client, fake_oidc)
    [row] = _sessions(db)
    assert row.id_hash != hash_token(old)


def _assert_sign_in_failed(res: Response, db: sessionmaker[Session]) -> None:
    assert res.status_code == 302
    assert res.headers["location"] == f"{get_settings().web_base_url}/sign-in?error=signin_failed"
    assert get_settings().session_cookie_name not in _set_cookies(res)
    assert _sessions(db) == []


def test_callback_state_mismatch_redirects_with_error(
    anon_client: TestClient, fake_oidc: FakeOIDC, db: sessionmaker[Session]
) -> None:
    location = _login(anon_client)
    code = fake_oidc.authorize(location)
    res = anon_client.get("/api/v1/auth/callback", params={"code": code, "state": "forged"})
    _assert_sign_in_failed(res, db)
    assert _users(db) == []


def test_callback_without_login_cookie(
    anon_client: TestClient, fake_oidc: FakeOIDC, db: sessionmaker[Session]
) -> None:
    # Login CSRF: an attacker's own code and state, delivered to a victim's browser
    location = _login(anon_client)
    code = fake_oidc.authorize(location)
    anon_client.cookies.clear()
    res = anon_client.get(
        "/api/v1/auth/callback", params={"code": code, "state": _query(location)["state"]}
    )
    _assert_sign_in_failed(res, db)


def test_callback_tampered_login_cookie(
    anon_client: TestClient, fake_oidc: FakeOIDC, db: sessionmaker[Session]
) -> None:
    _login(anon_client)
    name = f"{get_settings().session_cookie_name}_login"
    anon_client.cookies.set(name, "not base64 json", path="/api/v1/auth")
    res = anon_client.get("/api/v1/auth/callback", params={"code": "x", "state": "y"})
    _assert_sign_in_failed(res, db)


def test_callback_provider_error(
    anon_client: TestClient, fake_oidc: FakeOIDC, db: sessionmaker[Session]
) -> None:
    location = _login(anon_client)
    res = anon_client.get(
        "/api/v1/auth/callback",
        params={
            "error": "access_denied",
            "error_description": "User cancelled",
            "state": _query(location)["state"],
        },
    )
    _assert_sign_in_failed(res, db)


def test_callback_bad_code(
    anon_client: TestClient, fake_oidc: FakeOIDC, db: sessionmaker[Session]
) -> None:
    location = _login(anon_client)
    res = anon_client.get(
        "/api/v1/auth/callback", params={"code": "unknown", "state": _query(location)["state"]}
    )
    _assert_sign_in_failed(res, db)


@pytest.mark.parametrize(
    "claims",
    [
        {"nonce": "other"},
        {"iss": "https://evil.test/realms/relay"},
        {"aud": "another-client"},
        {"exp": 1},
        {"email": None},
    ],
    ids=["wrong nonce", "wrong issuer", "wrong audience", "expired", "no email"],
)
def test_callback_rejects_bad_id_token(
    anon_client: TestClient, fake_oidc: FakeOIDC, db: sessionmaker[Session], claims: dict[str, Any]
) -> None:
    _assert_sign_in_failed(_sign_in_via_provider(anon_client, fake_oidc, **claims), db)
    assert _users(db) == []


def test_callback_rejects_token_signed_with_unknown_key(
    anon_client: TestClient, fake_oidc: FakeOIDC, db: sessionmaker[Session]
) -> None:
    location = _login(anon_client)
    code = fake_oidc.authorize(location)
    real_key = fake_oidc.key
    forger = FakeOIDC()  # same claims, someone else's key
    fake_oidc.sign = forger.sign  # type: ignore[method-assign]
    res = anon_client.get(
        "/api/v1/auth/callback", params={"code": code, "state": _query(location)["state"]}
    )
    _assert_sign_in_failed(res, db)
    assert fake_oidc.key is real_key


def test_callback_follows_key_rotation(
    anon_client: TestClient, fake_oidc: FakeOIDC, db: sessionmaker[Session]
) -> None:
    assert _sign_in_via_provider(anon_client, fake_oidc).headers["location"].endswith("/")
    assert fake_oidc.jwks_fetches == 1
    fake_oidc.rotate_key()
    res = _sign_in_via_provider(anon_client, fake_oidc)
    assert res.headers["location"] == f"{get_settings().web_base_url}/"
    assert fake_oidc.jwks_fetches == 2


@pytest.mark.parametrize(
    "redirect",
    ["//evil.test", "https://evil.test", "/\\evil.test", "/\t/evil.test", "evil", ""],
)
def test_login_rejects_open_redirect(
    anon_client: TestClient, fake_oidc: FakeOIDC, redirect: str
) -> None:
    res = _sign_in_via_provider(anon_client, fake_oidc, redirect=redirect or None)
    assert res.headers["location"] == f"{get_settings().web_base_url}/"


def test_auth_7_logout_deletes_session_and_returns_end_session_url(
    anon_client: TestClient, fake_oidc: FakeOIDC, db: sessionmaker[Session]
) -> None:
    _sign_in_via_provider(anon_client, fake_oidc)
    [row] = _sessions(db)
    res = anon_client.post("/api/v1/auth/logout")
    assert res.status_code == 200
    url = res.json()["redirect_url"]
    assert url.startswith(END_SESSION_ENDPOINT + "?")
    settings = get_settings()
    assert _query(url) == {
        "id_token_hint": row.id_token,
        "client_id": settings.oidc_client_id,
        "post_logout_redirect_uri": f"{settings.web_base_url}/sign-in",
    }
    assert _sessions(db) == []
    cookie = _set_cookies(res)[settings.session_cookie_name]
    assert "Max-Age=0" in cookie and "Path=/" in cookie
    assert anon_client.get("/api/v1/me").status_code == 401


def test_logout_without_session(anon_client: TestClient, fake_oidc: FakeOIDC) -> None:
    res = anon_client.post("/api/v1/auth/logout")
    assert res.status_code == 200
    assert res.json() == {"redirect_url": f"{get_settings().web_base_url}/sign-in"}


def test_logout_provider_without_end_session(
    anon_client: TestClient, fake_oidc: FakeOIDC, db: sessionmaker[Session]
) -> None:
    fake_oidc.end_session_supported = False
    _sign_in_via_provider(anon_client, fake_oidc)
    res = anon_client.post("/api/v1/auth/logout")
    assert res.json() == {"redirect_url": f"{get_settings().web_base_url}/sign-in"}
    assert _sessions(db) == []


def test_logout_needs_csrf_header(client: TestClient, fake_oidc: FakeOIDC) -> None:
    del client.headers[CSRF_HEADER]
    assert client.post("/api/v1/auth/logout").status_code == 403
    assert client.get("/api/v1/me").status_code == 200


# Changing your own name


def test_update_me_changes_name(
    client: TestClient, user: AppUser, db: sessionmaker[Session]
) -> None:
    res = client.patch("/api/v1/me", json={"name": "  Olivia Owner  "})
    assert res.status_code == 200, res.text
    assert res.json() == {"id": str(user.id), "name": "Olivia Owner", "email": user.email}
    assert client.get("/api/v1/me").json()["name"] == "Olivia Owner"
    [row] = _users(db)
    assert (row.name, row.name_set_by_user, row.email) == ("Olivia Owner", True, user.email)


def test_update_me_requires_session(anon_client: TestClient) -> None:
    assert anon_client.patch("/api/v1/me", json={"name": "Ada"}).status_code == 401


def test_update_me_needs_csrf_header(client: TestClient, db: sessionmaker[Session]) -> None:
    del client.headers[CSRF_HEADER]
    assert client.patch("/api/v1/me", json={"name": "Ada"}).status_code == 403
    [row] = _users(db)
    assert (row.name, row.name_set_by_user) == ("Olive Owner", False)


@pytest.mark.parametrize(
    "body",
    [
        {},
        {"name": ""},
        {"name": "   "},
        {"name": "x" * 201},
        {"name": None},
        {"name": "Ada", "email": "ada@example.org"},
    ],
    ids=["missing", "empty", "blank", "too-long", "null", "email-not-editable"],
)
def test_update_me_rejects_bad_body(
    client: TestClient, db: sessionmaker[Session], body: dict[str, Any]
) -> None:
    assert client.patch("/api/v1/me", json=body).status_code == 422
    [row] = _users(db)
    assert (row.name, row.email, row.name_set_by_user) == (
        "Olive Owner",
        "owner@example.org",
        False,
    )


def test_update_me_accepts_200_characters(client: TestClient) -> None:
    res = client.patch("/api/v1/me", json={"name": "x" * 200})
    assert res.status_code == 200
    assert res.json()["name"] == "x" * 200


def test_name_set_in_app_survives_sign_in(
    client: TestClient, fake_oidc: FakeOIDC, user: AppUser, db: sessionmaker[Session]
) -> None:
    assert client.patch("/api/v1/me", json={"name": "Olivia Owner"}).status_code == 200
    assert client.post("/api/v1/auth/logout").status_code == 200
    assert client.get("/api/v1/me").status_code == 401

    res = _sign_in_via_provider(
        client, fake_oidc, sub=user.oidc_subject, email="olivia@example.org", name="Olive Owner"
    )
    assert res.status_code == 302
    me = client.get("/api/v1/me").json()
    # The name the user chose stays; the email still follows the provider
    assert (me["name"], me["email"]) == ("Olivia Owner", "olivia@example.org")
    [row] = _users(db)
    assert row.id == user.id and row.name_set_by_user


def test_name_not_set_in_app_follows_provider(
    anon_client: TestClient, fake_oidc: FakeOIDC, db: sessionmaker[Session]
) -> None:
    _sign_in_via_provider(anon_client, fake_oidc, name="Olive Owner")
    _sign_in_via_provider(anon_client, fake_oidc, name="Olive Renamed")
    [row] = _users(db)
    assert (row.name, row.name_set_by_user) == ("Olive Renamed", False)
    assert anon_client.get("/api/v1/me").json()["name"] == "Olive Renamed"


def test_new_name_shows_in_every_members_list(
    client: TestClient, org: str, make_user: MakeUser, add_member: AddMember, as_user: AsUser
) -> None:
    res = client.post("/api/v1/organisations", json={"name": "Beta", "country": "FR"})
    assert res.status_code == 201, res.text
    other_org = res.json()["id"]

    assert client.patch("/api/v1/me", json={"name": "Olivia Owner"}).status_code == 200

    for org_id in (org, other_org):
        listed = client.get(f"/api/v1/organisations/{org_id}/members").json()
        assert "Olivia Owner" in [m["name"] for m in listed], org_id
        assert "Olive Owner" not in [m["name"] for m in listed]
    # Colleagues see it too (only Owners may list members)
    colleague = make_user("co-owner@example.org", "Cora Colleague")
    add_member(org, colleague, "owner")
    listed = as_user(colleague).get(f"/api/v1/organisations/{org}/members").json()
    assert {m["name"] for m in listed} == {"Olivia Owner", "Sam Standard", "Cora Colleague"}
