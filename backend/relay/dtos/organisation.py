import uuid
from datetime import datetime

from pydantic import Field

from relay.domain.organisations import OrganisationStatus
from relay.dtos.base import DTO, RequestDTO


class OrganisationCreateDTO(RequestDTO):
    name: str = Field(min_length=1, max_length=200)
    country: str | None = Field(
        default=None, pattern=r"^[A-Z]{2}$", description="ISO 3166-1 alpha-2 code"
    )


class OrganisationDTO(DTO):
    id: uuid.UUID
    name: str
    country: str | None
    status: OrganisationStatus
    created_at: datetime


class OrganisationUpdateDTO(RequestDTO):
    """Partial update: fields left out stay unchanged."""

    name: str | None = Field(default=None, min_length=1, max_length=200)
    country: str | None = Field(
        default=None, pattern=r"^[A-Z]{2}$", description="ISO 3166-1 alpha-2 code"
    )
