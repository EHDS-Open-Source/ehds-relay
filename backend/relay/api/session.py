"""Sign-in through the identity provider and the signed-in user's own details.

The API acts as the browser's backend: it runs the OIDC flow and keeps the tokens
server-side behind a session cookie.
"""

import base64
import binascii
import json
import logging
import secrets
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from relay.auth.deps import CurrentUserDep
from relay.auth.oidc import IdentityClaims, OIDCClient, OIDCError, get_oidc_client
from relay.auth.sessions import create_session, pop_session
from relay.db import get_session
from relay.domain.users import AppUser
from relay.dtos.session import LogoutDTO, MeDTO, MeUpdateDTO
from relay.settings import Settings, get_settings

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["session"])

AUTH_PATH = "/api/v1/auth"
# Time allowed between leaving for the provider and coming back
LOGIN_COOKIE_MAX_AGE_SECONDS = 600
SIGN_IN_FAILED = "/sign-in?error=signin_failed"

DbDep = Annotated[Session, Depends(get_session)]
OIDCDep = Annotated[OIDCClient, Depends(get_oidc_client)]


@dataclass(frozen=True)
class LoginState:
    """What the callback needs to finish the sign-in this browser started."""

    state: str
    nonce: str
    code_verifier: str
    redirect: str

    def encode(self) -> str:
        return base64.urlsafe_b64encode(json.dumps(asdict(self)).encode()).decode()

    @classmethod
    def decode(cls, value: str) -> "LoginState":
        try:
            data = json.loads(base64.urlsafe_b64decode(value.encode()))
            return cls(
                state=str(data["state"]),
                nonce=str(data["nonce"]),
                code_verifier=str(data["code_verifier"]),
                redirect=safe_redirect(str(data["redirect"])),
            )
        except (binascii.Error, UnicodeError, ValueError, KeyError, TypeError) as exc:
            raise OIDCError(f"unreadable sign-in cookie: {type(exc).__name__}") from None


def safe_redirect(path: str | None) -> str:
    """A path on this site to return to after signing in; anything else becomes `/`.

    Rejects `//host` and `/\\host` (browsers read both as another site) and control
    characters (browsers drop tabs and newlines, which can turn `/\\t/host` into `//host`).
    """
    if (
        not path
        or not path.startswith("/")
        or path.startswith(("//", "/\\"))
        or any(ord(ch) < 0x20 or ord(ch) == 0x7F for ch in path)
    ):
        return "/"
    return path


# Outcomes of an account action that the provider reports back on the callback
ACTION_STATUSES = frozenset({"success", "cancelled", "error"})


def with_action_status(path: str, action_status: str | None) -> str:
    """Append `password=<status>` to a safe redirect path; unknown statuses are dropped."""
    if action_status not in ACTION_STATUSES:
        return path
    path, hash_mark, fragment = path.partition("#")
    separator = "&" if "?" in path else "?"
    return f"{path}{separator}password={action_status}{hash_mark}{fragment}"


def _login_cookie_name(settings: Settings) -> str:
    return f"{settings.session_cookie_name}_login"


def _secure(settings: Settings) -> bool:
    return settings.web_base_url.startswith("https://")


def _callback_url(settings: Settings) -> str:
    # Never built from the request: the provider only accepts redirects to the web origin
    return f"{settings.web_base_url}{AUTH_PATH}/callback"


def _sign_in_failed(settings: Settings, reason: str) -> RedirectResponse:
    log.warning("sign-in failed: %s", reason)
    res = RedirectResponse(f"{settings.web_base_url}{SIGN_IN_FAILED}", status.HTTP_302_FOUND)
    res.delete_cookie(
        _login_cookie_name(settings), path=AUTH_PATH, secure=_secure(settings), httponly=True
    )
    return res


def _upsert_user(db: Session, identity: IdentityClaims) -> AppUser:
    user = db.scalars(
        select(AppUser).where(
            AppUser.oidc_issuer == identity.issuer, AppUser.oidc_subject == identity.subject
        )
    ).one_or_none()
    if user is None:
        user = AppUser(oidc_issuer=identity.issuer, oidc_subject=identity.subject)
        db.add(user)
    # The provider owns the email; the name only until the user sets their own in the app
    user.email = identity.email
    if not user.name_set_by_user:
        user.name = identity.name
    user.last_login_at = datetime.now(UTC)
    db.flush()
    return user


@router.get("/me", response_model=MeDTO)
def get_me(user: CurrentUserDep) -> AppUser:
    return user


@router.patch("/me", response_model=MeDTO)
def update_me(body: MeUpdateDTO, user: CurrentUserDep, db: DbDep) -> AppUser:
    """Change the signed-in user's name, as shown to the other members of their organisations."""
    user.name = body.name
    user.name_set_by_user = True
    db.commit()
    return user


@router.get(
    "/auth/login",
    response_model=None,
    response_class=RedirectResponse,
    status_code=status.HTTP_302_FOUND,
)
def login(
    oidc: OIDCDep,
    redirect: Annotated[str | None, Query(description="Path to return to after signing in")] = None,
    signup: Annotated[
        bool, Query(description="Open the provider's registration page instead")
    ] = False,
    action: Annotated[
        Literal["change_password"] | None,
        Query(
            description="Ask the provider to run an account action after the user signs in "
            "again. `change_password` asks for the current password, then a new one."
        ),
    ] = None,
) -> RedirectResponse:
    """Redirect to the identity provider's sign-in page."""
    settings = get_settings()
    if signup and action:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "signup and action cannot be combined"
        )
    extra_params: dict[str, str] = {}
    if signup:
        extra_params["prompt"] = "create"
    elif action == "change_password":
        # prompt=login makes the provider ask for the current password first, even when its
        # own session is still active; then it shows its update-password form.
        extra_params.update(prompt="login", kc_action="UPDATE_PASSWORD")
    login_state = LoginState(
        state=secrets.token_urlsafe(32),
        nonce=secrets.token_urlsafe(32),
        code_verifier=secrets.token_urlsafe(64),
        redirect=safe_redirect(redirect),
    )
    try:
        url = oidc.authorization_url(
            redirect_uri=_callback_url(settings),
            state=login_state.state,
            nonce=login_state.nonce,
            code_verifier=login_state.code_verifier,
            extra_params=extra_params,
        )
    except Exception as exc:  # provider unreachable or misconfigured
        return _sign_in_failed(settings, f"cannot start sign-in: {type(exc).__name__}: {exc}")
    res = RedirectResponse(url, status.HTTP_302_FOUND)
    res.set_cookie(
        _login_cookie_name(settings),
        login_state.encode(),
        max_age=LOGIN_COOKIE_MAX_AGE_SECONDS,
        path=AUTH_PATH,
        secure=_secure(settings),
        httponly=True,
        samesite="lax",
    )
    return res


@router.get(
    "/auth/callback",
    response_model=None,
    response_class=RedirectResponse,
    status_code=status.HTTP_302_FOUND,
)
def auth_callback(
    request: Request,
    db: DbDep,
    oidc: OIDCDep,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    error_description: str | None = None,
    kc_action_status: str | None = None,
) -> RedirectResponse:
    """Complete sign-in, set the session cookie and redirect into the app.

    Any failure lands on the app's sign-in page with `?error=signin_failed`, never a raw error.
    After an account action (see `action` on login) the provider reports its outcome in
    `kc_action_status`; a known value is passed on as `?password=<status>`.
    """
    settings = get_settings()
    if error:
        return _sign_in_failed(settings, f"provider returned {error}: {error_description or ''}")
    cookie = request.cookies.get(_login_cookie_name(settings))
    if not cookie:
        return _sign_in_failed(settings, "no sign-in cookie (expired or another browser)")
    if not code or not state:
        return _sign_in_failed(settings, "callback without code or state")
    try:
        login_state = LoginState.decode(cookie)
        if not secrets.compare_digest(login_state.state.encode(), state.encode()):
            raise OIDCError("state does not match the sign-in cookie")
        identity = oidc.exchange(
            code=code,
            redirect_uri=_callback_url(settings),
            code_verifier=login_state.code_verifier,
            nonce=login_state.nonce,
        )
    except OIDCError as exc:
        return _sign_in_failed(settings, str(exc))
    except Exception as exc:  # e.g. signing keys unreachable
        return _sign_in_failed(settings, f"{type(exc).__name__}: {exc}")

    user = _upsert_user(db, identity)
    # A fresh session id at every sign-in, so a planted cookie cannot be carried over
    old = request.cookies.get(settings.session_cookie_name)
    if old:
        pop_session(db, old)
    token = create_session(db, user, settings, id_token=identity.id_token)
    db.commit()

    target = with_action_status(login_state.redirect, kc_action_status)
    res = RedirectResponse(f"{settings.web_base_url}{target}", status.HTTP_302_FOUND)
    res.set_cookie(
        settings.session_cookie_name,
        token,
        max_age=settings.session_max_hours * 3600,
        path="/",
        secure=_secure(settings),
        httponly=True,
        samesite="lax",
    )
    res.delete_cookie(
        _login_cookie_name(settings), path=AUTH_PATH, secure=_secure(settings), httponly=True
    )
    return res


@router.post("/auth/logout", response_model=LogoutDTO)
def logout(request: Request, response: Response, db: DbDep, oidc: OIDCDep) -> LogoutDTO:
    """End the session and say where to send the browser to sign out of the provider too.

    POST, so that following a link cannot sign anyone out. Succeeds without a session.
    """
    settings = get_settings()
    sign_in_url = f"{settings.web_base_url}/sign-in"
    token = request.cookies.get(settings.session_cookie_name)
    row = pop_session(db, token) if token else None
    response.delete_cookie(
        settings.session_cookie_name,
        path="/",
        secure=_secure(settings),
        httponly=True,
        samesite="lax",
    )
    if row is None or not row.id_token:
        return LogoutDTO(redirect_url=sign_in_url)
    try:
        url = oidc.end_session_url(id_token_hint=row.id_token, post_logout_redirect_uri=sign_in_url)
    except Exception as exc:  # provider unreachable: the local session is gone regardless
        log.warning("cannot build provider sign-out URL: %s: %s", type(exc).__name__, exc)
        url = None
    return LogoutDTO(redirect_url=url or sign_in_url)
