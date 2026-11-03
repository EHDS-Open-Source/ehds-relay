import uuid
from datetime import datetime

from pydantic import Field

from relay.domain.invitations import InvitationStatus
from relay.domain.memberships import MemberRole
from relay.dtos.base import DTO, RequestDTO
from relay.dtos.dataset_metadata import Email

__all__ = ["InvitationCreateDTO", "InvitationDTO", "InvitationPreviewDTO", "InvitationStatus"]


class InvitationCreateDTO(RequestDTO):
    email: Email = Field(description="Compared and stored lower-cased")
    role: MemberRole = MemberRole.STANDARD


class InvitationDTO(DTO):
    id: uuid.UUID
    org_id: uuid.UUID
    email: str = Field(description="Lower-cased")
    role: MemberRole
    status: InvitationStatus = Field(
        description="`expired` once `expires_at` has passed without the invitation being accepted"
    )
    invited_by: uuid.UUID | None = Field(description="User who sent the invitation")
    created_at: datetime
    last_sent_at: datetime = Field(
        description="When the invitation email was last sent: on create and on every resend"
    )
    expires_at: datetime


class InvitationPreviewDTO(DTO):
    """What an invitee sees when opening the link, before signing in to accept."""

    organisation_name: str
    invited_by_name: str | None
    email: str
    role: MemberRole
    status: InvitationStatus
    expires_at: datetime
