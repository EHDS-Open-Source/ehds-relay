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
]


_PUBLISH_DESCRIPTION = (
    "Save and publish: publish if nothing is missing, otherwise save as a draft and report "
    "what is missing. False saves a draft, which also takes a published dataset back to draft."
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


class DatasetPublishDTO(RequestDTO):
    version: int = Field(ge=1, description="Version last read by the client; 409 if stale")


class RevalidationReminderUpdateDTO(RequestDTO):
    due_date: date | None = Field(
        description="When to remind members to revalidate the metadata; null clears it"
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

    @computed_field(description="Mandatory fields still missing before this can be published")
    @property
    def missing_for_publish(self) -> list[str]:
        return self.metadata.missing_for_publish()
