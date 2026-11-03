"""FastAPI dependencies for the signed-in user."""

from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from relay.auth.sessions import get_valid_session
from relay.db import get_session
from relay.domain.users import AppUser
from relay.settings import get_settings


def current_user(request: Request, db: Annotated[Session, Depends(get_session)]) -> AppUser:
    """The user behind the session cookie; 401 if there is none or it has expired.

    Uses the request's own database session, so a handler sees the same transaction.
    """
    settings = get_settings()
    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="not signed in")
    row = get_valid_session(db, token, settings)
    user = db.get(AppUser, row.user_id) if row is not None else None
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="session expired")
    return user


CurrentUserDep = Annotated[AppUser, Depends(current_user)]
