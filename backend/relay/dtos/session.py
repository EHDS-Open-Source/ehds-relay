import uuid

from pydantic import Field, field_validator

from relay.dtos.base import DTO, RequestDTO


class MeDTO(DTO):
    """The signed-in user."""

    id: uuid.UUID
    name: str
    email: str


class MeUpdateDTO(RequestDTO):
    """Change the signed-in user's name. Once set here, signing in no longer replaces it.

    The email address belongs to the identity provider and cannot be changed here.
    """

    name: str = Field(min_length=1, max_length=200)

    @field_validator("name", mode="before")
    @classmethod
    def _strip(cls, value: object) -> object:
        # Leading and trailing spaces are dropped, so a name of only spaces counts as empty
        return value.strip() if isinstance(value, str) else value


class LogoutDTO(DTO):
    """Where the browser goes next to finish signing out.

    Usually the provider's end-session page, which ends its single sign-on session too and then
    returns to the app's sign-in page.
    """

    redirect_url: str | None
