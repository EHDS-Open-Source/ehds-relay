import uuid
from datetime import datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from relay.db import Base

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

    __mapper_args__ = {"version_id_col": version}  # noqa: RUF012
