import uuid
from typing import NoReturn

from fastapi import APIRouter, Depends, status

from relay.api.stubs import not_implemented
from relay.auth.deps import current_user
from relay.dtos.membership import MemberDTO, MemberUpdateDTO

router = APIRouter(
    prefix="/api/v1/organisations/{org_id}/members",
    tags=["members"],
    dependencies=[Depends(current_user)],
)


@router.get("", response_model=list[MemberDTO])
def list_members(org_id: uuid.UUID) -> NoReturn:
    not_implemented()


@router.patch("/{user_id}", response_model=MemberDTO)
def update_member(org_id: uuid.UUID, user_id: uuid.UUID, body: MemberUpdateDTO) -> NoReturn:
    """Change a member's role. Demoting the last owner is refused."""
    not_implemented()


@router.delete("/{user_id}", response_model=None, status_code=status.HTTP_204_NO_CONTENT)
def remove_member(org_id: uuid.UUID, user_id: uuid.UUID) -> NoReturn:
    """Remove a member; their datasets stay. Removing the last owner is refused."""
    not_implemented()
