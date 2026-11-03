import uuid
from datetime import datetime
from enum import StrEnum

from pydantic import Field

from relay.dtos.base import DTO, RequestDTO
from relay.dtos.dataset_metadata import Email
from relay.dtos.membership import MemberRole


class InvitationStatus(StrEnum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class InvitationCreateDTO(RequestDTO):
    email: Email
    role: MemberRole = MemberRole.STANDARD


class InvitationDTO(DTO):
    id: uuid.UUID
    org_id: uuid.UUID
    email: str
    role: MemberRole
    status: InvitationStatus
    invited_by: uuid.UUID | None = Field(description="User who sent the invitation")
    created_at: datetime
    expires_at: datetime


class InvitationPreviewDTO(DTO):
    """What an invitee sees when opening the link, before signing in to accept."""

    organisation_name: str
    invited_by_name: str | None
    email: str
    role: MemberRole
    status: InvitationStatus
    expires_at: datetime
