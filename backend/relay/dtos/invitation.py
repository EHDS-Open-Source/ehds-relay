import uuid
from datetime import datetime

from pydantic import Field, field_validator

from relay.domain.invitations import InvitationStatus
from relay.domain.memberships import MemberRole
from relay.dtos.base import DTO, RequestDTO
from relay.dtos.dataset_metadata import Email

__all__ = ["InvitationCreateDTO", "InvitationDTO", "InvitationPreviewDTO", "InvitationStatus"]


INVITATION_NAME_MAX_LENGTH = 200
INVITATION_MESSAGE_MAX_LENGTH = 1000


class InvitationCreateDTO(RequestDTO):
    email: Email = Field(description="Compared and stored lower-cased")
    role: MemberRole = MemberRole.STANDARD
    name: str = Field(
        min_length=1,
        max_length=INVITATION_NAME_MAX_LENGTH,
        description=(
            "Who is being invited; the email greets them by this name. Runs of whitespace "
            f"become one space. At most {INVITATION_NAME_MAX_LENGTH} characters."
        ),
    )
    message: str | None = Field(
        default=None,
        max_length=INVITATION_MESSAGE_MAX_LENGTH,
        description=(
            "Optional personal note shown in the email. Blank counts as none. "
            f"At most {INVITATION_MESSAGE_MAX_LENGTH} characters."
        ),
    )

    @field_validator("name", mode="before")
    @classmethod
    def _tidy_name(cls, value: object) -> object:
        # A name is one line: a name of only spaces counts as empty
        return " ".join(value.split()) if isinstance(value, str) else value

    @field_validator("message", mode="before")
    @classmethod
    def _tidy_message(cls, value: object) -> object:
        # Line breaks are paragraphs and stay; blank means no message
        if not isinstance(value, str):
            return value
        value = value.replace("\r\n", "\n").replace("\r", "\n").strip()
        return value or None


class InvitationDTO(DTO):
    id: uuid.UUID
    org_id: uuid.UUID
    email: str = Field(description="Lower-cased")
    role: MemberRole
    name: str | None = Field(description="Empty on invitations created before names existed")
    message: str | None
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
