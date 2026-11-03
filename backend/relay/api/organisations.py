from collections.abc import Sequence
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from relay.auth.authz import MemberDep, OwnerDep
from relay.auth.deps import CurrentUserDep, current_user
from relay.db import get_session
from relay.domain.memberships import MemberRole, Membership, OrgRow, org_row_for, org_rows_for
from relay.domain.organisations import Organisation
from relay.dtos.organisation import OrganisationCreateDTO, OrganisationDTO, OrganisationUpdateDTO

router = APIRouter(
    prefix="/api/v1/organisations", tags=["organisations"], dependencies=[Depends(current_user)]
)

SessionDep = Annotated[Session, Depends(get_session)]


def _reselect(session: Session, membership: Membership) -> OrgRow:
    row = org_row_for(session, membership.user_id, membership.org_id)
    assert row is not None  # the caller's membership was just checked or created
    return row


@router.post("", response_model=OrganisationDTO, status_code=status.HTTP_201_CREATED)
def create_organisation(
    body: OrganisationCreateDTO, user: CurrentUserDep, session: SessionDep
) -> OrgRow:
    """Create an organisation; the caller becomes its first Owner."""
    org = Organisation(name=body.name, country=body.country)
    session.add(org)
    session.flush()
    membership = Membership(org_id=org.id, user_id=user.id, role=MemberRole.OWNER.value)
    session.add(membership)
    session.commit()
    return _reselect(session, membership)


@router.get("", response_model=list[OrganisationDTO])
def list_organisations(user: CurrentUserDep, session: SessionDep) -> Sequence[OrgRow]:
    """The caller's organisations, each with the caller's role."""
    return org_rows_for(session, user.id)


@router.get("/{org_id}", response_model=OrganisationDTO)
def get_organisation(membership: MemberDep, session: SessionDep) -> OrgRow:
    return _reselect(session, membership)


@router.patch("/{org_id}", response_model=OrganisationDTO)
def update_organisation(
    body: OrganisationUpdateDTO, owner: OwnerDep, session: SessionDep
) -> OrgRow:
    """Owners only. Updates the fields that were sent."""
    org = session.get_one(Organisation, owner.org_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(org, field, value)
    session.commit()
    return _reselect(session, owner)
