import uuid
from collections.abc import Sequence
from datetime import datetime
from enum import StrEnum

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Row, Text, case, func, select
from sqlalchemy.orm import Mapped, Session, mapped_column

from relay.db import Base
from relay.domain.organisations import Organisation, OrganisationStatus
from relay.domain.users import AppUser


class MemberRole(StrEnum):
    """A user's role in one organisation; the same user can hold different roles elsewhere."""

    OWNER = "owner"
    STANDARD = "standard"


class Membership(Base):
    """One user's role in one organisation. Datasets do not point here, so removing a member
    leaves the datasets they created in place."""

    __tablename__ = "membership"
    __table_args__ = (CheckConstraint("role IN ('owner', 'standard')", name="ck_membership_role"),)

    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organisation.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("app_user.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    role: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


# Organisation as seen by one member: its columns plus that member's role
OrgRow = Row[uuid.UUID, str, str | None, str, datetime, str]
# A member as listed on the organisation's members screen
MemberRow = Row[uuid.UUID, str, str, str, datetime]


def _org_rows_stmt(user_id: uuid.UUID):
    return (
        select(
            Organisation.id,
            Organisation.name,
            Organisation.country,
            Organisation.status,
            Organisation.created_at,
            Membership.role,
        )
        .join(Membership, Membership.org_id == Organisation.id)
        .where(
            Membership.user_id == user_id,
            Organisation.status != OrganisationStatus.DELETED.value,
        )
    )


def org_rows_for(session: Session, user_id: uuid.UUID) -> Sequence[OrgRow]:
    """The user's organisations with their role, ordered by name."""
    stmt = _org_rows_stmt(user_id).order_by(func.lower(Organisation.name), Organisation.id)
    return session.execute(stmt).all()


def org_row_for(session: Session, user_id: uuid.UUID, org_id: uuid.UUID) -> OrgRow | None:
    stmt = _org_rows_stmt(user_id).where(Organisation.id == org_id)
    return session.execute(stmt).one_or_none()


def _member_rows_stmt(org_id: uuid.UUID):
    return (
        select(
            Membership.user_id,
            AppUser.name,
            AppUser.email,
            Membership.role,
            Membership.created_at.label("joined_at"),
        )
        .join(AppUser, AppUser.id == Membership.user_id)
        .where(Membership.org_id == org_id)
    )


def member_rows(session: Session, org_id: uuid.UUID) -> Sequence[MemberRow]:
    """Members of the organisation: Owners first, then by name."""
    owners_first = case((Membership.role == MemberRole.OWNER.value, 0), else_=1)
    stmt = _member_rows_stmt(org_id).order_by(
        owners_first, func.lower(AppUser.name), Membership.user_id
    )
    return session.execute(stmt).all()


def member_row(session: Session, org_id: uuid.UUID, user_id: uuid.UUID) -> MemberRow | None:
    stmt = _member_rows_stmt(org_id).where(Membership.user_id == user_id)
    return session.execute(stmt).one_or_none()


def owner_count(session: Session, org_id: uuid.UUID) -> int:
    stmt = select(func.count()).where(
        Membership.org_id == org_id, Membership.role == MemberRole.OWNER.value
    )
    return session.scalar(stmt) or 0
