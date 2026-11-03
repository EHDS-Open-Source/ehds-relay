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


class LogoutDTO(DTO):
    """Where the browser goes next to finish signing out.

    Usually the provider's end-session page, which ends its single sign-on session too and then
    returns to the app's sign-in page.
    """

    redirect_url: str | None
