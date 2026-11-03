import uuid
from datetime import UTC, date, datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Text,
    func,
    select,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, column_property, mapped_column

from relay.db import Base
from relay.domain.users import AppUser

# Version of the metadata document layout (Health DCAT-AP release 8, EU minimum metadata)
CURRENT_SCHEMA_VERSION = "healthdcat-ap-r8/2"


class DatasetStatus(StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"


class AccessRights(StrEnum):
    """Access level of a dataset, mapped to the EU access-right authority table."""

    PUBLIC = "public"
    RESTRICTED = "restricted"
    NON_PUBLIC = "non_public"


class Dataset(Base):
    __tablename__ = "dataset"
    __table_args__ = (
        CheckConstraint("status IN ('draft', 'published')", name="ck_dataset_status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("gen_random_uuid()")
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organisation.id"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(
        Text, nullable=False, server_default=DatasetStatus.DRAFT.value
    )
    # Denormalised from the metadata document so they can be listed and searched cheaply
    title: Mapped[str | None] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    metadata_doc: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    schema_version: Mapped[str] = mapped_column(Text, nullable=False)
    # Optimistic lock: bumped on every update, checked by the ORM at flush time
    version: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Revalidation reminder: app data kept beside the metadata, never exported. The person
    # who last set the date is the one it is meant for.
    reminder_date: Mapped[date | None] = mapped_column(Date)
    reminder_set_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("app_user.id", ondelete="SET NULL", name="fk_dataset_reminder_set_by")
    )
    reminder_set_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # When the reminder email went out; cleared whenever the date is set again
    reminder_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reminder_set_by_name: Mapped[str | None] = column_property(
        select(AppUser.name).where(AppUser.id == reminder_set_by).scalar_subquery()
    )
    # When a save last passed the publish checks and left the dataset published
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # When a member last confirmed the metadata is still right (set by a revalidate action)
    last_revalidated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    __mapper_args__ = {"version_id_col": version}  # noqa: RUF012

    @property
    def last_validated_at(self) -> datetime | None:
        return last_validated(self.published_at, self.last_revalidated_at)

    @property
    def overdue(self) -> bool:
        return is_overdue(self.status, self.last_validated_at)


def add_one_year(moment: datetime) -> datetime:
    """The same moment a year later. 29 February becomes 28 February, as in Postgres."""
    try:
        return moment.replace(year=moment.year + 1)
    except ValueError:
        return moment.replace(year=moment.year + 1, day=28)


def last_validated(
    published_at: datetime | None, last_revalidated_at: datetime | None
) -> datetime | None:
    """The later of the last publish and the last revalidation, if either happened."""
    dates = [d for d in (published_at, last_revalidated_at) if d is not None]
    return max(dates) if dates else None


def is_overdue(
    status: str, last_validated_at: datetime | None, now: datetime | None = None
) -> bool:
    """A published dataset is overdue once a year has passed since it was last validated.

    Drafts are never overdue: they have not been through the publish checks.
    """
    if status != DatasetStatus.PUBLISHED or last_validated_at is None:
        return False
    return (now or datetime.now(UTC)) >= add_one_year(last_validated_at)
