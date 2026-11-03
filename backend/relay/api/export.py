"""Health DCAT-AP output: per-dataset export and validation, and whole-catalogue export."""

import uuid
from typing import Annotated, NoReturn

from fastapi import APIRouter, Depends, Query, Response

from relay.api.stubs import not_implemented
from relay.auth.deps import current_user
from relay.dtos.export import EXPORT_RESPONSES, ExportFormat, ValidationReportDTO

router = APIRouter(
    prefix="/api/v1/organisations/{org_id}", tags=["export"], dependencies=[Depends(current_user)]
)

FormatQuery = Annotated[ExportFormat, Query(alias="format")]


@router.get(
    "/datasets/{dataset_id}/export",
    response_model=None,
    response_class=Response,
    responses=EXPORT_RESPONSES,
)
def export_dataset(
    org_id: uuid.UUID, dataset_id: uuid.UUID, export_format: FormatQuery = ExportFormat.TTL
) -> NoReturn:
    """The dataset's record as a downloadable file. Incomplete records are refused with 422."""
    not_implemented()


@router.post("/datasets/{dataset_id}/validate", response_model=ValidationReportDTO)
def validate_dataset(org_id: uuid.UUID, dataset_id: uuid.UUID) -> NoReturn:
    not_implemented()


@router.get(
    "/catalogue/export",
    response_model=None,
    response_class=Response,
    responses=EXPORT_RESPONSES,
)
def export_catalogue(org_id: uuid.UUID, export_format: FormatQuery = ExportFormat.TTL) -> NoReturn:
    """Every dataset in the organisation as one catalogue file."""
    not_implemented()
