"""Sign-in through the identity provider and the signed-in user's own details.

The API acts as the browser's backend: it runs the OIDC flow and keeps the tokens
server-side behind a session cookie.
"""

from typing import Annotated, NoReturn

from fastapi import APIRouter, Query, status
from fastapi.responses import RedirectResponse

from relay.api.stubs import not_implemented
from relay.auth.deps import CurrentUserDep
from relay.domain.users import AppUser
from relay.dtos.session import MeDTO, MeUpdateDTO

router = APIRouter(prefix="/api/v1", tags=["session"])


@router.get("/me", response_model=MeDTO)
def get_me(user: CurrentUserDep) -> AppUser:
    return user


@router.patch("/me", response_model=MeDTO)
def update_me(body: MeUpdateDTO, user: CurrentUserDep) -> NoReturn:
    not_implemented()


@router.get(
    "/auth/login",
    response_model=None,
    response_class=RedirectResponse,
    status_code=status.HTTP_302_FOUND,
)
def login(
    redirect: Annotated[str | None, Query(description="Path to return to after signing in")] = None,
) -> NoReturn:
    """Redirect to the identity provider's sign-in page."""
    not_implemented()


@router.get(
    "/auth/callback",
    response_model=None,
    response_class=RedirectResponse,
    status_code=status.HTTP_302_FOUND,
)
def auth_callback(code: str | None = None, state: str | None = None) -> NoReturn:
    """Complete sign-in, set the session cookie and redirect into the app."""
    not_implemented()


@router.post("/auth/logout", response_model=None, status_code=status.HTTP_204_NO_CONTENT)
def logout() -> NoReturn:
    """End the session. POST, so that following a link cannot sign anyone out."""
    not_implemented()
