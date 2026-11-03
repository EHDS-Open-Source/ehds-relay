import uuid
from collections.abc import Sequence
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from relay.db import get_session
from relay.domain.organisations import Organisation
from relay.dtos.organisation import OrganisationCreateDTO, OrganisationDTO

router = APIRouter(prefix="/api/v1/organisations", tags=["organisations"])

SessionDep = Annotated[Session, Depends(get_session)]


@router.post("", response_model=OrganisationDTO, status_code=status.HTTP_201_CREATED)
def create_organisation(body: OrganisationCreateDTO, session: SessionDep) -> Organisation:
    org = Organisation(name=body.name, country=body.country)
    session.add(org)
    session.commit()
    session.refresh(org)
    return org


@router.get("", response_model=list[OrganisationDTO])
def list_organisations(session: SessionDep) -> Sequence[Organisation]:
    return session.scalars(select(Organisation).order_by(Organisation.created_at)).all()


@router.get("/{org_id}", response_model=OrganisationDTO)
def get_organisation(org_id: uuid.UUID, session: SessionDep) -> Organisation:
    org = session.get(Organisation, org_id)
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="organisation not found")
    return org
