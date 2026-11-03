"""Organisation-level authorisation: the one place that decides who may act on an organisation.

Every route under /organisations/{org_id} depends on `require_member` or `require_owner`.
A non-member gets 404, so the response does not reveal that the organisation exists.
A Standard member on an Owner-only action gets 403.
"""

import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from relay.auth.deps import CurrentUserDep
from relay.db import get_session, set_tenant
from relay.domain.memberships import MemberRole, Membership
from relay.domain.organisations import Organisation, OrganisationStatus


def require_member(
    org_id: uuid.UUID,
    user: CurrentUserDep,
    session: Annotated[Session, Depends(get_session)],
) -> Membership:
    """The caller's membership of the organisation in the path; 404 if there is none."""
    membership = session.scalars(
        select(Membership)
        .join(Organisation, Organisation.id == Membership.org_id)
        .where(
            Membership.org_id == org_id,
            Membership.user_id == user.id,
            Organisation.status != OrganisationStatus.DELETED.value,
        )
    ).one_or_none()
    if membership is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="organisation not found")
    # Every later query in this request sees only this organisation's tenant rows
    set_tenant(session, org_id)
    # TODO: refuse writes to suspended organisations once that is decided.
    return membership


MemberDep = Annotated[Membership, Depends(require_member)]


def require_owner(membership: MemberDep) -> Membership:
    """Like `require_member`, and 403 unless the caller is an Owner."""
    if membership.role != MemberRole.OWNER:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="owner role required")
    return membership


OwnerDep = Annotated[Membership, Depends(require_owner)]


def lock_org(session: Session, org_id: uuid.UUID) -> None:
    """Lock the organisation row until the transaction ends.

    Membership changes in one organisation then run one at a time, so a check such as
    "another Owner remains" cannot be passed by two concurrent requests at once.
    """
    session.execute(select(Organisation.id).where(Organisation.id == org_id).with_for_update())


def recheck_owner(session: Session, owner: Membership) -> None:
    """Read the caller's role again, after `lock_org`.

    `require_owner` ran before the lock, so a concurrent request may have demoted or removed
    the caller since then.
    """
    role = session.scalar(
        select(Membership.role).where(
            Membership.org_id == owner.org_id, Membership.user_id == owner.user_id
        )
    )
    if role is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="organisation not found")
    if role != MemberRole.OWNER:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="owner role required")
