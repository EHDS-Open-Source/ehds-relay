import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import CheckConstraint, DateTime, String, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column

from relay.db import Base


class OrganisationStatus(StrEnum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    DELETED = "deleted"


class Organisation(Base):
    __tablename__ = "organisation"
    __table_args__ = (
        CheckConstraint(
            "status IN ('active', 'suspended', 'deleted')", name="ck_organisation_status"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("gen_random_uuid()")
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    country: Mapped[str | None] = mapped_column(String(2))
    status: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=OrganisationStatus.ACTIVE.value
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
