"""Server-side sessions behind an opaque cookie.

The cookie holds random bytes; the database stores only their SHA-256, so a leaked table
cannot be replayed as cookies.
"""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from relay.domain.users import AppUser, UserSession
from relay.settings import Settings

# Writing last_seen_at on every request would be wasteful; this is fine-grained enough for an
# idle timeout measured in minutes.
TOUCH_INTERVAL = timedelta(minutes=1)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_session(
    db: Session, user: AppUser, settings: Settings, id_token: str | None = None
) -> str:
    """Add a session for the user and return the cookie value. The caller commits."""
    token = secrets.token_urlsafe(32)
    now = datetime.now(UTC)
    db.add(
        UserSession(
            id_hash=hash_token(token),
            user_id=user.id,
            id_token=id_token,
            created_at=now,
            last_seen_at=now,
            expires_at=now + timedelta(hours=settings.session_max_hours),
        )
    )
    return token


def get_valid_session(db: Session, token: str, settings: Settings) -> UserSession | None:
    """The live session for a cookie value, or None.

    Expired sessions are deleted on sight. Commits when it deletes or refreshes last_seen_at.
    """
    row = db.get(UserSession, hash_token(token))
    if row is None:
        return None
    now = datetime.now(UTC)
    idle_limit = row.last_seen_at + timedelta(minutes=settings.session_idle_minutes)
    if now >= row.expires_at or now >= idle_limit:
        db.delete(row)
        db.commit()
        return None
    if now - row.last_seen_at >= TOUCH_INTERVAL:
        row.last_seen_at = now
        db.commit()
    return row


def pop_session(db: Session, token: str) -> UserSession | None:
    """Delete the session for a cookie value, whatever its state, and return it. Commits."""
    row = db.get(UserSession, hash_token(token))
    if row is not None:
        db.delete(row)
        db.commit()
    return row
