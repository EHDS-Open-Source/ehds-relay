import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Text,
    UniqueConstraint,
    false,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from relay.db import Base


class AppUser(Base):
    """A person known to the identity provider who has signed in at least once.

    Looked up by issuer and subject. The email is copied from the provider at each sign-in, and so
    is the name until the user sets their own in the app.
    """

    __tablename__ = "app_user"
    __table_args__ = (
        UniqueConstraint("oidc_issuer", "oidc_subject", name="uq_app_user_oidc_identity"),
        Index("ix_app_user_email_lower", func.lower(text("email"))),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("gen_random_uuid()")
    )
    oidc_issuer: Mapped[str] = mapped_column(Text, nullable=False)
    oidc_subject: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    # True once the user has changed their name in the app; sign-in then leaves it alone.
    name_set_by_user: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=false()
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    last_login_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class UserSession(Base):
    """A signed-in browser. The cookie holds a random token; only its SHA-256 is stored."""

    __tablename__ = "user_session"

    id_hash: Mapped[str] = mapped_column(Text, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("app_user.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Kept only as the hint for the provider's sign-out; the API calls no other services.
    id_token: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    # Absolute expiry; the idle timeout is checked against last_seen_at.
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
