import uuid
from collections.abc import Sequence
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from relay.auth.authz import OwnerDep, lock_org, recheck_owner
from relay.auth.deps import current_user
from relay.db import get_session
from relay.domain.memberships import (
    MemberRole,
    MemberRow,
    Membership,
    member_row,
    member_rows,
    owner_count,
)
from relay.dtos.membership import MemberDTO, MemberUpdateDTO

router = APIRouter(
    prefix="/api/v1/organisations/{org_id}/members",
    tags=["members"],
    dependencies=[Depends(current_user)],
)

SessionDep = Annotated[Session, Depends(get_session)]

LAST_OWNER_DETAIL = "cannot remove or demote the last owner"
ALREADY_OWNER_DETAIL = "member is already an owner"


def _locked_target(session: Session, owner: Membership, user_id: uuid.UUID) -> Membership:
    """Lock the organisation and load the member being changed, with fresh values."""
    lock_org(session, owner.org_id)
    target = session.get(Membership, (owner.org_id, user_id), populate_existing=True)
    if target is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="member not found")
    return target


def _refuse_if_last_owner(session: Session, target: Membership) -> None:
    if target.role == MemberRole.OWNER and owner_count(session, target.org_id) <= 1:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=LAST_OWNER_DETAIL)


@router.get("", response_model=list[MemberDTO])
def list_members(owner: OwnerDep, session: SessionDep) -> Sequence[MemberRow]:
    """Owners only. Owners first, then by name."""
    return member_rows(session, owner.org_id)


@router.patch("/{user_id}", response_model=MemberDTO)
def update_member(
    user_id: uuid.UUID, body: MemberUpdateDTO, owner: OwnerDep, session: SessionDep
) -> MemberRow:
    """Change a member's role. Demoting the last owner is refused."""
    target = _locked_target(session, owner, user_id)
    if target.role != body.role:
        if body.role != MemberRole.OWNER:
            _refuse_if_last_owner(session, target)
        recheck_owner(session, owner)
        target.role = body.role.value
    session.commit()
    row = member_row(session, owner.org_id, user_id)
    assert row is not None  # just updated under the organisation lock
    return row


@router.delete("/{user_id}", response_model=None, status_code=status.HTTP_204_NO_CONTENT)
def remove_member(user_id: uuid.UUID, owner: OwnerDep, session: SessionDep) -> None:
    """Remove a member; their datasets stay. Removing the last owner is refused."""
    target = _locked_target(session, owner, user_id)
    _refuse_if_last_owner(session, target)
    recheck_owner(session, owner)
    session.delete(target)
    session.commit()


@router.post(
    "/{user_id}/transfer-ownership",
    response_model=MemberDTO,
    responses={status.HTTP_409_CONFLICT: {"description": "The member is already an owner"}},
)
def transfer_ownership(user_id: uuid.UUID, owner: OwnerDep, session: SessionDep) -> MemberRow:
    """Make a member the owner and turn the caller into a standard member.

    Both changes happen in one transaction under the organisation lock, so the organisation
    never has fewer owners than before. Other owners keep their role. Returns the new owner.
    """
    target = _locked_target(session, owner, user_id)
    recheck_owner(session, owner)
    if target.role == MemberRole.OWNER:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=ALREADY_OWNER_DETAIL)
    caller = session.get(Membership, (owner.org_id, owner.user_id), populate_existing=True)
    assert caller is not None  # recheck_owner just confirmed it under the lock
    target.role = MemberRole.OWNER.value
    caller.role = MemberRole.STANDARD.value
    session.commit()
    row = member_row(session, owner.org_id, user_id)
    assert row is not None  # just updated under the organisation lock
    return row
