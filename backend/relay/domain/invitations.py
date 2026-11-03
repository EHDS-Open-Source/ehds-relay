import uuid
from datetime import UTC, datetime
from enum import StrEnum

from sqlalchemy import (
    CheckConstraint,
    ColumnElement,
    DateTime,
    ForeignKey,
    Index,
    Text,
    and_,
    case,
    func,
    text,
)
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import Mapped, mapped_column

from relay.db import Base


class InvitationStatus(StrEnum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class Invitation(Base):
    """An invitation for one email address to join one organisation with a given role.

    The link carries a random token; only its SHA-256 is stored. A pending invitation past
    its expiry date reads as expired, so no job has to sweep them.
    """

    __tablename__ = "invitation"
    __table_args__ = (
        CheckConstraint("role IN ('owner', 'standard')", name="ck_invitation_role"),
        CheckConstraint(
            "status IN ('pending', 'accepted', 'cancelled', 'expired')",
            name="ck_invitation_status",
        ),
        # At most one live invitation per person per organisation
        Index(
            "uq_invitation_pending_email",
            "org_id",
            "email",
            unique=True,
            postgresql_where=text("status = 'pending'"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("gen_random_uuid()")
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organisation.id", ondelete="CASCADE"), nullable=False
    )
    # Stored lower-cased
    email: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(Text, nullable=False)
    token_hash: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    # What was last written; read `status` instead, which accounts for expiry
    stored_status: Mapped[str] = mapped_column(
        "status", Text, nullable=False, server_default=InvitationStatus.PENDING.value
    )
    invited_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("app_user.id", ondelete="SET NULL")
    )
    accepted_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("app_user.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    # When the email was last queued: on create and on every resend
    last_sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    @hybrid_property
    def status(self) -> str:
        if self.stored_status == InvitationStatus.PENDING.value and self.expires_at <= datetime.now(
            UTC
        ):
            return InvitationStatus.EXPIRED.value
        return self.stored_status

    @status.inplace.expression
    @classmethod
    def _status_expression(cls) -> ColumnElement[str]:
        return case(
            (
                and_(
                    cls.stored_status == InvitationStatus.PENDING.value,
                    cls.expires_at <= func.now(),
                ),
                InvitationStatus.EXPIRED.value,
            ),
            else_=cls.stored_status,
        )
