import uuid
from datetime import datetime

from pydantic import Field, field_validator

from relay.domain.memberships import MemberRole
from relay.domain.organisations import OrganisationStatus
from relay.dtos.base import DTO, RequestDTO

COUNTRY_PATTERN = r"^[A-Z]{2}$"
COUNTRY_DESCRIPTION = "ISO 3166-1 alpha-2 code"


class OrganisationCreateDTO(RequestDTO):
    name: str = Field(min_length=1, max_length=200)
    country: str = Field(pattern=COUNTRY_PATTERN, description=COUNTRY_DESCRIPTION)


class OrganisationDTO(DTO):
    id: uuid.UUID
    name: str
    country: str | None
    status: OrganisationStatus
    created_at: datetime
    role: MemberRole = Field(description="The signed-in user's role in this organisation")


class OrganisationUpdateDTO(RequestDTO):
    """Partial update: fields left out stay unchanged. Neither field may be set to null."""

    name: str | None = Field(default=None, min_length=1, max_length=200)
    country: str | None = Field(
        default=None, pattern=COUNTRY_PATTERN, description=COUNTRY_DESCRIPTION
    )

    @field_validator("name", "country", mode="before")
    @classmethod
    def _reject_null(cls, value: object) -> object:
        # Only runs for fields that were sent, so an omitted field stays allowed
        if value is None:
            raise ValueError("may not be null")
        return value
