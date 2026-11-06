import uuid
from datetime import date, datetime
from typing import Self

from pydantic import Field, computed_field, model_validator

from relay.domain.datasets import AccessRights, DatasetStatus
from relay.dtos.base import DTO, RequestDTO
from relay.dtos.dataset_metadata import DatasetMetadata

__all__ = [
    "AccessRights",
    "DatasetCreateDTO",
    "DatasetDTO",
    "DatasetPublishDTO",
    "DatasetUpdateDTO",
    "RevalidationReminderUpdateDTO",
]

# The furthest ahead a reminder can be set; catches typos such as a five-digit year
REMINDER_MAX_YEARS_AHEAD = 5


_PUBLISH_DESCRIPTION = (
    "Save and publish: publish if nothing is missing, otherwise save as a draft and report "
    "what is missing. On a published dataset, true saves and publishes again (resetting the "
    "validation date) and 422 lists the missing fields; false saves and keeps it published "
    "if it is still complete, else 422. False never unpublishes: use `unpublish`."
)

_UNPUBLISH_DESCRIPTION = (
    "Save as a draft and take a published dataset out of the catalogue, whether or not the "
    "metadata is complete. The validation date is kept. On a draft this is a plain draft "
    "save. Cannot be combined with `publish`."
)


class _DatasetSaveDTO(RequestDTO):
    metadata: DatasetMetadata
    publish: bool = Field(default=False, description=_PUBLISH_DESCRIPTION)

    @model_validator(mode="after")
    def _needs_a_title(self) -> Self:
        # Even a draft needs a title, so it has a name in the list
        if not (self.metadata.display_title() or "").strip():
            raise ValueError("a title is required to save a dataset")
        return self


class DatasetCreateDTO(_DatasetSaveDTO):
    pass


class DatasetUpdateDTO(_DatasetSaveDTO):
    version: int = Field(ge=1, description="Version last read by the client; 409 if stale")
    unpublish: bool = Field(default=False, description=_UNPUBLISH_DESCRIPTION)

    @model_validator(mode="after")
    def _not_both(self) -> Self:
        if self.publish and self.unpublish:
            raise ValueError("publish and unpublish cannot both be set")
        return self


class DatasetPublishDTO(RequestDTO):
    version: int = Field(ge=1, description="Version last read by the client; 409 if stale")


class RevalidationReminderUpdateDTO(RequestDTO):
    reminder_date: date | None = Field(
        description=(
            "When to remind the member who sets it to revalidate the metadata. Must be after "
            f"today and at most {REMINDER_MAX_YEARS_AHEAD} years ahead; null clears it"
        )
    )


class DatasetDTO(DTO):
    id: uuid.UUID
    org_id: uuid.UUID
    status: DatasetStatus
    title: str | None
    description: str | None
    # The stored JSON was validated on the way in, so it parses back into the same shape
    metadata: DatasetMetadata = Field(validation_alias="metadata_doc")
    schema_version: str
    version: int
    created_at: datetime
    updated_at: datetime
    # App data kept beside the metadata; none of it is part of the exported record
    reminder_date: date | None = Field(description="When the revalidation reminder is due")
    reminder_set_by: uuid.UUID | None = Field(
        description="Who set the reminder date, and so who it is for"
    )
    reminder_set_by_name: str | None
    reminder_set_at: datetime | None
    reminder_sent_at: datetime | None = Field(description="When the reminder email went out")
    published_at: datetime | None = Field(
        description="When a save last passed the publish checks and left the dataset published"
    )
    last_revalidated_at: datetime | None = Field(
        description="When a member last confirmed the metadata is still right"
    )
    last_validated_at: datetime | None = Field(
        description="The later of published_at and last_revalidated_at"
    )
    overdue: bool = Field(
        description="Published and not validated for a year since last_validated_at"
    )

    @computed_field(description="Mandatory fields still missing before this can be published")
    @property
    def missing_for_publish(self) -> list[str]:
        return self.metadata.missing_for_publish()
