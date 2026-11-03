import uuid
from typing import Annotated, NoReturn

from fastapi import APIRouter, Depends, Query, status

from relay.api.stubs import not_implemented
from relay.auth.deps import current_user
from relay.dtos.invitation import (
    InvitationCreateDTO,
    InvitationDTO,
    InvitationPreviewDTO,
    InvitationStatus,
)
from relay.dtos.organisation import OrganisationDTO

# Managed by an organisation's owners
org_router = APIRouter(
    prefix="/api/v1/organisations/{org_id}/invitations",
    tags=["invitations"],
    dependencies=[Depends(current_user)],
)
# Used by the invitee, who may not be a member of anything yet. The preview is public;
# accepting needs a session.
router = APIRouter(prefix="/api/v1/invitations", tags=["invitations"])


@org_router.get("", response_model=list[InvitationDTO])
def list_invitations(
    org_id: uuid.UUID,
    invitation_status: Annotated[InvitationStatus | None, Query(alias="status")] = None,
) -> NoReturn:
    not_implemented()


@org_router.post("", response_model=InvitationDTO, status_code=status.HTTP_201_CREATED)
def create_invitation(org_id: uuid.UUID, body: InvitationCreateDTO) -> NoReturn:
    not_implemented()


@org_router.delete("/{invitation_id}", response_model=None, status_code=status.HTTP_204_NO_CONTENT)
def cancel_invitation(org_id: uuid.UUID, invitation_id: uuid.UUID) -> NoReturn:
    """Cancel a pending invitation; its link stops working."""
    not_implemented()


@org_router.post("/{invitation_id}/resend", response_model=InvitationDTO)
def resend_invitation(org_id: uuid.UUID, invitation_id: uuid.UUID) -> NoReturn:
    not_implemented()


@router.get("/{token}", response_model=InvitationPreviewDTO)
def get_invitation(token: str) -> NoReturn:
    """Readable without signing in, so the invitee knows what they are joining."""
    not_implemented()


@router.post(
    "/{token}/accept",
    response_model=OrganisationDTO,
    dependencies=[Depends(current_user)],
)
def accept_invitation(token: str) -> NoReturn:
    """Join the organisation as the signed-in user, with the role given in the invitation."""
    not_implemented()
