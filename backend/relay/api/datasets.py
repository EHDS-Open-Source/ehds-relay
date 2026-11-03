import uuid
from collections.abc import Sequence
from typing import Annotated, NoReturn

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from sqlalchemy.orm.exc import StaleDataError

from relay.api.stubs import not_implemented
from relay.auth.authz import require_member
from relay.auth.deps import current_user
from relay.db import get_session
from relay.domain.datasets import CURRENT_SCHEMA_VERSION, Dataset, DatasetStatus
from relay.dtos.dataset import (
    AccessRights,
    DatasetCreateDTO,
    DatasetDTO,
    DatasetPublishDTO,
    DatasetUpdateDTO,
    RevalidationReminderUpdateDTO,
)
from relay.dtos.dataset_metadata import DatasetMetadata

router = APIRouter(
    prefix="/api/v1/organisations/{org_id}/datasets",
    tags=["datasets"],
    # Every dataset route is for members of the organisation only; others get 404
    dependencies=[Depends(current_user), Depends(require_member)],
)

SessionDep = Annotated[Session, Depends(get_session)]


def _get_dataset(session: Session, org_id: uuid.UUID, dataset_id: uuid.UUID) -> Dataset:
    ds = session.get(Dataset, dataset_id)
    if ds is None or ds.org_id != org_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="dataset not found")
    return ds


def _apply_metadata(ds: Dataset, meta: DatasetMetadata) -> None:
    ds.metadata_doc = meta.model_dump(mode="json")
    ds.title = meta.title
    ds.description = meta.description
    ds.schema_version = CURRENT_SCHEMA_VERSION
    ds.updated_at = func.now()  # pyright: ignore[reportAttributeAccessIssue]


def _check_version(ds: Dataset, version: int) -> None:
    if ds.version != version:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail=f"stale version: dataset is at version {ds.version}, got {version}",
        )


def _commit(session: Session, ds: Dataset) -> None:
    try:
        session.commit()
    except StaleDataError:
        # A concurrent writer won between our read and our write
        session.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT, detail="dataset was modified concurrently"
        ) from None
    session.refresh(ds)


@router.post("", response_model=DatasetDTO, status_code=status.HTTP_201_CREATED)
def create_dataset(org_id: uuid.UUID, body: DatasetCreateDTO, session: SessionDep) -> Dataset:
    ds = Dataset(org_id=org_id, status=DatasetStatus.DRAFT.value)
    _apply_metadata(ds, body.metadata)
    session.add(ds)
    session.commit()
    session.refresh(ds)
    return ds


@router.get("", response_model=list[DatasetDTO])
def list_datasets(
    org_id: uuid.UUID,
    session: SessionDep,
    dataset_status: DatasetStatus | None = None,
    # Declared so clients can be generated against them; not applied yet
    q: Annotated[
        str | None,
        Query(description="Search title, description, keywords and health data category"),
    ] = None,
    access_rights: Annotated[
        AccessRights | None, Query(description="Only datasets with this access level")
    ] = None,
) -> Sequence[Dataset]:
    stmt = select(Dataset).where(Dataset.org_id == org_id).order_by(Dataset.created_at)
    if dataset_status is not None:
        stmt = stmt.where(Dataset.status == dataset_status.value)
    return session.scalars(stmt).all()


@router.get("/{dataset_id}", response_model=DatasetDTO)
def get_dataset(org_id: uuid.UUID, dataset_id: uuid.UUID, session: SessionDep) -> Dataset:
    return _get_dataset(session, org_id, dataset_id)


@router.put("/{dataset_id}", response_model=DatasetDTO)
def update_dataset(
    org_id: uuid.UUID, dataset_id: uuid.UUID, body: DatasetUpdateDTO, session: SessionDep
) -> Dataset:
    ds = _get_dataset(session, org_id, dataset_id)
    _check_version(ds, body.version)
    if ds.status == DatasetStatus.PUBLISHED:
        # Published metadata must stay publishable
        missing = body.metadata.missing_for_publish()
        if missing:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"published dataset requires: {', '.join(missing)}",
            )
    _apply_metadata(ds, body.metadata)
    _commit(session, ds)
    return ds


@router.post("/{dataset_id}/publish", response_model=DatasetDTO)
def publish_dataset(
    org_id: uuid.UUID, dataset_id: uuid.UUID, body: DatasetPublishDTO, session: SessionDep
) -> Dataset:
    ds = _get_dataset(session, org_id, dataset_id)
    _check_version(ds, body.version)
    if ds.status == DatasetStatus.PUBLISHED:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="dataset is already published")
    missing = DatasetMetadata.model_validate(ds.metadata_doc).missing_for_publish()
    if missing:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"cannot publish, missing: {', '.join(missing)}",
        )
    ds.status = DatasetStatus.PUBLISHED.value
    ds.updated_at = func.now()  # pyright: ignore[reportAttributeAccessIssue]
    _commit(session, ds)
    return ds


@router.delete("/{dataset_id}", response_model=None, status_code=status.HTTP_204_NO_CONTENT)
def delete_dataset(org_id: uuid.UUID, dataset_id: uuid.UUID) -> NoReturn:
    """Owners only."""
    not_implemented()


@router.put("/{dataset_id}/revalidation-reminder", response_model=DatasetDTO)
def set_revalidation_reminder(
    org_id: uuid.UUID, dataset_id: uuid.UUID, body: RevalidationReminderUpdateDTO
) -> NoReturn:
    """Set or clear the date members are reminded to revalidate the metadata."""
    not_implemented()


@router.post("/{dataset_id}/revalidate", response_model=DatasetDTO)
def revalidate_dataset(org_id: uuid.UUID, dataset_id: uuid.UUID) -> NoReturn:
    """Record that the metadata was checked today and move the next reminder a year ahead."""
    not_implemented()
