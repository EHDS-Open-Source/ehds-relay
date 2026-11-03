import uuid

from pydantic import Field

from relay.dtos.base import DTO, RequestDTO


class MeDTO(DTO):
    """The signed-in user."""

    id: uuid.UUID
    name: str
    email: str


class MeUpdateDTO(RequestDTO):
    name: str = Field(min_length=1, max_length=200)
