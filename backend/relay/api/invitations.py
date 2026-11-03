import secrets
import uuid
from collections.abc import Sequence
from datetime import UTC, datetime, timedelta
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import Row, func, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from relay.auth.authz import OwnerDep
from relay.auth.deps import CurrentUserDep, current_user
from relay.auth.sessions import hash_token
from relay.db import get_session
from relay.domain.invitations import Invitation, InvitationStatus
from relay.domain.memberships import Membership, OrgRow, org_row_for
from relay.domain.organisations import Organisation, OrganisationStatus
from relay.domain.users import AppUser
from relay.dtos.invitation import InvitationCreateDTO, InvitationDTO, InvitationPreviewDTO
from relay.dtos.organisation import OrganisationDTO
from relay.email.messages import invitation_email
from relay.email.outbox import enqueue
from relay.settings import get_settings

# Managed by an organisation's owners
org_router = APIRouter(
    prefix="/api/v1/organisations/{org_id}/invitations",
    tags=["invitations"],
    dependencies=[Depends(current_user)],
)
# Used by the invitee, who may not be a member of anything yet. The preview is public;
# accepting needs a session.
router = APIRouter(prefix="/api/v1/invitations", tags=["invitations"])

SessionDep = Annotated[Session, Depends(get_session)]

ALREADY_MEMBER = "already a member of this organisation"
ALREADY_INVITED = "already invited; resend the pending invitation instead"
NOT_PENDING = "invitation is no longer pending"
INVITATION_NOT_FOUND = "invitation not found"
EMAIL_MISMATCH = "this invitation was sent to a different email address"


def _error(code: int, description: str) -> dict[int | str, dict[str, Any]]:
    return {code: {"description": description}}


def _new_token() -> str:
    return secrets.token_urlsafe(32)


def _issue(session: Session, invitation: Invitation, inviter: AppUser) -> None:
    """Give the invitation a fresh link and expiry and queue the email with that link.

    The raw token exists only here: it goes into the email and is never stored.
    """
    settings = get_settings()
    # Read before changing the invitation, so no flush happens until the commit
    org_name = session.scalar(select(Organisation.name).where(Organisation.id == invitation.org_id))
    assert org_name is not None  # the caller is an Owner of this organisation
    token = _new_token()
    now = datetime.now(UTC)
    invitation.token_hash = hash_token(token)
    invitation.stored_status = InvitationStatus.PENDING.value
    invitation.last_sent_at = now
    invitation.expires_at = now + timedelta(days=settings.invitation_ttl_days)
    subject, text, html = invitation_email(
        org_name=org_name,
        inviter_name=inviter.name,
        role=invitation.role,
        link=f"{settings.web_base_url}/invitations/{token}",
        expires_at=invitation.expires_at,
    )
    enqueue(session, invitation.email, subject, text, html)


def _commit_or_conflict(session: Session) -> None:
    try:
        session.commit()
    except IntegrityError as exc:
        # The partial unique index: another pending invitation for the same email was created
        # concurrently
        session.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, detail=ALREADY_INVITED) from exc


def _org_invitation(session: Session, org_id: uuid.UUID, invitation_id: uuid.UUID) -> Invitation:
    invitation = session.scalars(
        select(Invitation)
        .where(Invitation.id == invitation_id, Invitation.org_id == org_id)
        .with_for_update()
    ).one_or_none()
    if invitation is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=INVITATION_NOT_FOUND)
    return invitation


@org_router.get("", response_model=list[InvitationDTO])
def list_invitations(
    owner: OwnerDep,
    session: SessionDep,
    invitation_status: Annotated[InvitationStatus | None, Query(alias="status")] = None,
) -> Sequence[Invitation]:
    """Owners only. Newest first."""
    stmt = select(Invitation).where(Invitation.org_id == owner.org_id)
    if invitation_status is not None:
        stmt = stmt.where(Invitation.status == invitation_status.value)
    stmt = stmt.order_by(Invitation.created_at.desc(), Invitation.id)
    return session.scalars(stmt).all()


@org_router.post(
    "",
    response_model=InvitationDTO,
    status_code=status.HTTP_201_CREATED,
    responses=_error(409, "The person is already a member, or already has a pending invitation"),
)
def create_invitation(
    body: InvitationCreateDTO, owner: OwnerDep, user: CurrentUserDep, session: SessionDep
) -> Invitation:
    """Owners only. Emails the invitee a link that is valid for 30 days."""
    email = body.email.strip().lower()
    is_member = session.scalar(
        select(func.count())
        .select_from(Membership)
        .join(AppUser, AppUser.id == Membership.user_id)
        .where(Membership.org_id == owner.org_id, func.lower(AppUser.email) == email)
    )
    if is_member:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=ALREADY_MEMBER)
    # A pending invitation past its expiry no longer blocks a new one
    session.execute(
        update(Invitation)
        .where(
            Invitation.org_id == owner.org_id,
            Invitation.email == email,
            Invitation.status == InvitationStatus.EXPIRED.value,
            Invitation.stored_status == InvitationStatus.PENDING.value,
        )
        .values(stored_status=InvitationStatus.EXPIRED.value)
    )
    pending = session.scalar(
        select(Invitation.id).where(
            Invitation.org_id == owner.org_id,
            Invitation.email == email,
            Invitation.stored_status == InvitationStatus.PENDING.value,
        )
    )
    if pending is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=ALREADY_INVITED)
    invitation = Invitation(
        org_id=owner.org_id, email=email, role=body.role.value, invited_by=user.id
    )
    _issue(session, invitation, user)
    session.add(invitation)
    _commit_or_conflict(session)
    session.refresh(invitation)
    return invitation


@org_router.delete(
    "/{invitation_id}",
    response_model=None,
    status_code=status.HTTP_204_NO_CONTENT,
    responses=_error(409, "The invitation is not pending"),
)
def cancel_invitation(invitation_id: uuid.UUID, owner: OwnerDep, session: SessionDep) -> None:
    """Cancel a pending invitation; its link stops working."""
    invitation = _org_invitation(session, owner.org_id, invitation_id)
    if invitation.status != InvitationStatus.PENDING:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=NOT_PENDING)
    invitation.stored_status = InvitationStatus.CANCELLED.value
    session.commit()


@org_router.post(
    "/{invitation_id}/resend",
    response_model=InvitationDTO,
    responses=_error(409, "The invitation was accepted or cancelled"),
)
def resend_invitation(
    invitation_id: uuid.UUID, owner: OwnerDep, user: CurrentUserDep, session: SessionDep
) -> Invitation:
    """Send a new link (the old one stops working) and restart the 30 days.

    Works on pending and expired invitations.
    """
    invitation = _org_invitation(session, owner.org_id, invitation_id)
    if invitation.status not in (InvitationStatus.PENDING, InvitationStatus.EXPIRED):
        raise HTTPException(status.HTTP_409_CONFLICT, detail=NOT_PENDING)
    _issue(session, invitation, user)
    _commit_or_conflict(session)
    session.refresh(invitation)
    return invitation


PreviewRow = Row[str, str | None, str, str, str, datetime]


@router.get(
    "/{token}",
    response_model=InvitationPreviewDTO,
    responses=_error(404, "Unknown link"),
)
def get_invitation(token: str, session: SessionDep) -> PreviewRow:
    """Readable without signing in, so the invitee knows what they are joining."""
    inviter = AppUser.__table__.alias("inviter")
    row = session.execute(
        select(
            Organisation.name.label("organisation_name"),
            inviter.c.name.label("invited_by_name"),
            Invitation.email,
            Invitation.role,
            Invitation.status.label("status"),
            Invitation.expires_at,
        )
        .join(Organisation, Organisation.id == Invitation.org_id)
        .outerjoin(inviter, inviter.c.id == Invitation.invited_by)
        .where(
            Invitation.token_hash == hash_token(token),
            Organisation.status != OrganisationStatus.DELETED.value,
        )
    ).one_or_none()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=INVITATION_NOT_FOUND)
    return row


@router.post(
    "/{token}/accept",
    response_model=OrganisationDTO,
    dependencies=[Depends(current_user)],
    responses={
        **_error(403, "The signed-in account's email is not the invited email"),
        **_error(404, "Unknown link"),
        **_error(410, "The invitation was cancelled, has expired, or was used by someone else"),
    },
)
def accept_invitation(token: str, user: CurrentUserDep, session: SessionDep) -> OrgRow:
    """Join the organisation as the signed-in user, with the role given in the invitation.

    The signed-in account must have the invited email address. Accepting again is harmless.
    Someone who is already a member keeps their current role.
    """
    invitation = session.scalars(
        select(Invitation).where(Invitation.token_hash == hash_token(token)).with_for_update()
    ).one_or_none()
    if invitation is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=INVITATION_NOT_FOUND)
    org_status = session.scalar(
        select(Organisation.status).where(Organisation.id == invitation.org_id)
    )
    if org_status is None or org_status == OrganisationStatus.DELETED:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=INVITATION_NOT_FOUND)

    current = invitation.status
    if current == InvitationStatus.ACCEPTED:
        row = org_row_for(session, user.id, invitation.org_id)
        if row is None:
            raise HTTPException(status.HTTP_410_GONE, detail=NOT_PENDING)
        return row
    if current != InvitationStatus.PENDING:
        raise HTTPException(status.HTTP_410_GONE, detail=f"invitation is {current}")
    if user.email.strip().lower() != invitation.email:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail=EMAIL_MISMATCH)

    session.execute(
        insert(Membership)
        .values(org_id=invitation.org_id, user_id=user.id, role=invitation.role)
        .on_conflict_do_nothing(index_elements=["org_id", "user_id"])
    )
    invitation.stored_status = InvitationStatus.ACCEPTED.value
    invitation.accepted_by = user.id
    invitation.accepted_at = datetime.now(UTC)
    session.commit()
    row = org_row_for(session, user.id, invitation.org_id)
    assert row is not None  # membership exists and the organisation is not deleted
    return row
