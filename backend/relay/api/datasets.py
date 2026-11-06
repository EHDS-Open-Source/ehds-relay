import uuid
from collections.abc import Sequence
from datetime import UTC, date, datetime
from typing import Annotated, NoReturn

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from sqlalchemy.orm.exc import StaleDataError

from relay.api.stubs import not_implemented
from relay.auth.authz import OwnerDep, require_member
from relay.auth.deps import CurrentUserDep, current_user
from relay.db import get_session
from relay.domain.datasets import CURRENT_SCHEMA_VERSION, Dataset, DatasetStatus
from relay.domain.reminders import set_reminder
from relay.dtos.dataset import (
    REMINDER_MAX_YEARS_AHEAD,
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


def get_org_dataset(session: Session, org_id: uuid.UUID, dataset_id: uuid.UUID) -> Dataset:
    """The dataset if it belongs to `org_id`, else 404 (as if it did not exist)."""
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


def _apply_status(
    ds: Dataset, publish: bool, meta: DatasetMetadata, *, unpublish: bool = False
) -> None:
    """Set the status a save leads to.

    A draft is published only by a save that asks to publish and is complete; otherwise it
    stays a draft. A published dataset stays published on any save unless the save asks to
    unpublish, and must still be complete: if it is not, the save is rejected (422) and
    nothing is stored. Only an explicit publish that passes the checks moves `published_at`.
    """
    missing = meta.missing_for_publish()
    if ds.status == DatasetStatus.PUBLISHED.value:
        if unpublish:
            ds.status = DatasetStatus.DRAFT.value
            return
        if missing:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=[
                    {
                        "loc": ["body", "metadata", field],
                        "msg": "required to keep the dataset published",
                        "type": "missing",
                    }
                    for field in missing
                ],
            )
        if publish:
            _mark_published(ds)
        return
    if publish and not missing:
        ds.status = DatasetStatus.PUBLISHED.value
        _mark_published(ds)
    else:
        ds.status = DatasetStatus.DRAFT.value


def _mark_published(ds: Dataset) -> None:
    """The record just passed the publish checks: that counts as its latest validation."""
    ds.published_at = func.now()  # pyright: ignore[reportAttributeAccessIssue]


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
    ds = Dataset(org_id=org_id)
    _apply_metadata(ds, body.metadata)
    _apply_status(ds, body.publish, body.metadata)
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
    return get_org_dataset(session, org_id, dataset_id)


@router.put("/{dataset_id}", response_model=DatasetDTO)
def update_dataset(
    org_id: uuid.UUID, dataset_id: uuid.UUID, body: DatasetUpdateDTO, session: SessionDep
) -> Dataset:
    ds = get_org_dataset(session, org_id, dataset_id)
    _check_version(ds, body.version)
    _apply_status(ds, body.publish, body.metadata, unpublish=body.unpublish)
    _apply_metadata(ds, body.metadata)
    _commit(session, ds)
    return ds


@router.post("/{dataset_id}/publish", response_model=DatasetDTO)
def publish_dataset(
    org_id: uuid.UUID, dataset_id: uuid.UUID, body: DatasetPublishDTO, session: SessionDep
) -> Dataset:
    ds = get_org_dataset(session, org_id, dataset_id)
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
    _mark_published(ds)
    ds.updated_at = func.now()  # pyright: ignore[reportAttributeAccessIssue]
    _commit(session, ds)
    return ds


@router.delete("/{dataset_id}", response_model=None, status_code=status.HTTP_204_NO_CONTENT)
def delete_dataset(
    org_id: uuid.UUID, dataset_id: uuid.UUID, _owner: OwnerDep, session: SessionDep
) -> None:
    """Delete the dataset for good. Owners only."""
    session.delete(get_org_dataset(session, org_id, dataset_id))
    session.commit()


@router.put("/{dataset_id}/revalidation-reminder", response_model=DatasetDTO)
def set_revalidation_reminder(
    org_id: uuid.UUID,
    dataset_id: uuid.UUID,
    body: RevalidationReminderUpdateDTO,
    user: CurrentUserDep,
    session: SessionDep,
) -> Dataset:
    """Set, change or clear the date the caller is reminded to revalidate the metadata.

    Any member can do this. It does not change the metadata, so the dataset's version and
    last-changed time stay as they are.
    """
    ds = get_org_dataset(session, org_id, dataset_id)
    if body.reminder_date is not None:
        today = datetime.now(UTC).date()
        if body.reminder_date <= today:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="the reminder date must be in the future",
            )
        if body.reminder_date > _years_ahead(today, REMINDER_MAX_YEARS_AHEAD):
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=(
                    f"the reminder date must be at most {REMINDER_MAX_YEARS_AHEAD} years ahead"
                ),
            )
    set_reminder(session, ds, body.reminder_date, user.id)
    return ds


def _years_ahead(day: date, years: int) -> date:
    try:
        return day.replace(year=day.year + years)
    except ValueError:  # 29 February
        return day.replace(year=day.year + years, day=28)


@router.post("/{dataset_id}/revalidate", response_model=DatasetDTO)
def revalidate_dataset(org_id: uuid.UUID, dataset_id: uuid.UUID) -> NoReturn:
    """Record that the metadata was checked today and move the next reminder a year ahead."""
    not_implemented()
