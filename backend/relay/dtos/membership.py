import uuid
from datetime import datetime
from enum import StrEnum

from relay.dtos.base import DTO, RequestDTO


class MemberRole(StrEnum):
    """A user's role in one organisation; the same user can hold different roles elsewhere."""

    OWNER = "owner"
    STANDARD = "standard"


class MemberDTO(DTO):
    """A member of an organisation, as listed on its members screen."""

    user_id: uuid.UUID
    name: str
    email: str
    role: MemberRole
    joined_at: datetime


class MemberUpdateDTO(RequestDTO):
    role: MemberRole
