import uuid
from collections.abc import Sequence
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from sqlalchemy.orm.exc import StaleDataError

from relay.db import get_session
from relay.domain.datasets import CURRENT_SCHEMA_VERSION, Dataset, DatasetStatus
from relay.domain.organisations import Organisation
from relay.dtos.dataset import DatasetCreateDTO, DatasetDTO, DatasetPublishDTO, DatasetUpdateDTO
from relay.dtos.dataset_metadata import DatasetMetadata

router = APIRouter(prefix="/api/v1/organisations/{org_id}/datasets", tags=["datasets"])

SessionDep = Annotated[Session, Depends(get_session)]


def _require_org(session: Session, org_id: uuid.UUID) -> None:
    if session.get(Organisation, org_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="organisation not found")


def _get_dataset(session: Session, org_id: uuid.UUID, dataset_id: uuid.UUID) -> Dataset:
    _require_org(session, org_id)
    ds = session.get(Dataset, dataset_id)
    if ds is None or ds.org_id != org_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="dataset not found")
    return ds


def _apply_metadata(ds: Dataset, meta: DatasetMetadata) -> None:
    ds.metadata_doc = meta.model_dump(mode="json")
    ds.title = meta.display_title()
    ds.description = meta.display_description()
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
    _require_org(session, org_id)
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
) -> Sequence[Dataset]:
    _require_org(session, org_id)
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
