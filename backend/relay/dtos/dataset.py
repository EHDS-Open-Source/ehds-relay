import uuid
from datetime import datetime
from typing import Any

from pydantic import Field, computed_field

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


class DatasetCreateDTO(RequestDTO):
    metadata: DatasetMetadata = Field(default_factory=DatasetMetadata)


class DatasetUpdateDTO(RequestDTO):
    metadata: DatasetMetadata
    version: int = Field(ge=1, description="Version last read by the client; 409 if stale")


class DatasetPublishDTO(RequestDTO):
    version: int = Field(ge=1, description="Version last read by the client; 409 if stale")


class DatasetDTO(DTO):
    id: uuid.UUID
    org_id: uuid.UUID
    status: DatasetStatus
    title: str | None
    description: str | None
    # Stored JSON is returned as-is; it was validated on the way in
    metadata: dict[str, Any] = Field(validation_alias="metadata_doc")
    schema_version: str
    version: int
    created_at: datetime
    updated_at: datetime

    @computed_field(description="Mandatory fields still missing before this can be published")
    @property
    def missing_for_publish(self) -> list[str]:
        return DatasetMetadata.model_validate(self.metadata).missing_for_publish()
