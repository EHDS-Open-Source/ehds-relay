import uuid
from datetime import datetime

from relay.domain.memberships import MemberRole
from relay.dtos.base import DTO, RequestDTO

__all__ = ["MemberDTO", "MemberRole", "MemberUpdateDTO"]


class MemberDTO(DTO):
    """A member of an organisation, as listed on its members screen."""

    user_id: uuid.UUID
    name: str
    email: str
    role: MemberRole
    joined_at: datetime


class MemberUpdateDTO(RequestDTO):
    role: MemberRole
