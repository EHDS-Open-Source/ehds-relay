"""Health DCAT-AP output: per-dataset export and validation, and whole-catalogue export."""

import re
import unicodedata
import uuid
from collections.abc import Callable
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from rdflib import Graph, URIRef
from sqlalchemy import select

from relay.api.datasets import SessionDep, get_org_dataset
from relay.auth.authz import require_member
from relay.auth.deps import current_user
from relay.domain.datasets import Dataset, DatasetStatus
from relay.domain.organisations import Organisation
from relay.dtos.dataset_metadata import DatasetMetadata
from relay.dtos.export import (
    EXPORT_EXTENSIONS,
    EXPORT_MEDIA_TYPES,
    EXPORT_RESPONSES,
    ExportFormat,
    ValidationReportDTO,
    ValidationSeverity,
    ValidationViolationDTO,
)
from relay.rdf import add_catalogue, add_dataset, new_graph, to_jsonld, to_rdfxml, to_turtle
from relay.rdf.validate import validate_graph
from relay.settings import get_settings

# Members of the organisation only; others get 404
router = APIRouter(
    prefix="/api/v1/organisations/{org_id}",
    tags=["export"],
    dependencies=[Depends(current_user), Depends(require_member)],
)

FormatQuery = Annotated[ExportFormat, Query(alias="format")]

_SERIALISERS: dict[ExportFormat, Callable[[Graph], str]] = {
    ExportFormat.TTL: to_turtle,
    ExportFormat.JSONLD: to_jsonld,
    ExportFormat.RDFXML: to_rdfxml,
}


def dataset_iri(org_id: uuid.UUID, dataset_id: uuid.UUID) -> URIRef:
    """The dataset's identity in exported records: its record page in the web app."""
    return URIRef(f"{get_settings().web_base_url}/orgs/{org_id}/datasets/{dataset_id}")


def catalogue_iri(org_id: uuid.UUID) -> URIRef:
    return URIRef(f"{get_settings().web_base_url}/orgs/{org_id}/catalogue")


def slugify(text: str) -> str:
    """Lower-case words joined by hyphens, accents dropped; the web app's file name rule."""
    decomposed = unicodedata.normalize("NFKD", text)
    plain = "".join(c for c in decomposed if not 0x300 <= ord(c) <= 0x36F)
    return re.sub(r"[^a-z0-9]+", "-", plain.lower()).strip("-")


def _file_response(graph: Graph, export_format: ExportFormat, name: str) -> Response:
    file_name = f"{name}.{EXPORT_EXTENSIONS[export_format]}"
    return Response(
        content=_SERIALISERS[export_format](graph).encode("utf-8"),
        media_type=EXPORT_MEDIA_TYPES[export_format],
        headers={"Content-Disposition": f'attachment; filename="{file_name}"'},
    )


def _metadata(ds: Dataset) -> DatasetMetadata:
    return DatasetMetadata.from_stored(ds.metadata_doc)


@router.get(
    "/datasets/{dataset_id}/export",
    response_model=None,
    response_class=Response,
    responses=EXPORT_RESPONSES,
)
def export_dataset(
    org_id: uuid.UUID,
    dataset_id: uuid.UUID,
    session: SessionDep,
    export_format: FormatQuery = ExportFormat.TTL,
) -> Response:
    """The dataset's record as a downloadable file. Incomplete records are refused with 422.

    Export does not run the official checks; `validate` does.
    """
    ds = get_org_dataset(session, org_id, dataset_id)
    meta = _metadata(ds)
    missing = meta.missing_for_publish()
    if missing:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"cannot export, missing: {', '.join(missing)}",
        )
    graph = new_graph()
    add_dataset(graph, dataset_iri(org_id, ds.id), meta)
    return _file_response(graph, export_format, slugify(ds.title or "") or "dataset")


@router.post("/datasets/{dataset_id}/validate", response_model=ValidationReportDTO)
def validate_dataset(
    org_id: uuid.UUID, dataset_id: uuid.UUID, session: SessionDep
) -> ValidationReportDTO:
    """Check the record against the official Health DCAT-AP shapes for its access level.

    `conforms` is true only when nothing is missing and no rule is broken (warnings do not
    count). Without an access level there is no shape set to check against, so only the
    missing fields are reported.
    """
    ds = get_org_dataset(session, org_id, dataset_id)
    meta = _metadata(ds)
    missing = meta.missing_for_publish()
    violations: list[ValidationViolationDTO] = []
    if meta.access_rights is not None:
        subject = dataset_iri(org_id, ds.id)
        graph = new_graph()
        add_dataset(graph, subject, meta)
        violations = [
            ValidationViolationDTO(
                path=f.path,
                field=f.field,
                message=f.message,
                severity=ValidationSeverity(f.severity),
            )
            for f in validate_graph(graph, subject, meta.access_rights)
        ]
    broken = any(v.severity == ValidationSeverity.VIOLATION for v in violations)
    conforms = meta.access_rights is not None and not missing and not broken
    return ValidationReportDTO(conforms=conforms, missing=missing, violations=violations)


@router.get(
    "/catalogue/export",
    response_model=None,
    response_class=Response,
    responses=EXPORT_RESPONSES,
)
def export_catalogue(
    org_id: uuid.UUID, session: SessionDep, export_format: FormatQuery = ExportFormat.TTL
) -> Response:
    """Every published dataset in the organisation as one catalogue file.

    Drafts are left out. A catalogue with no published datasets is still a valid file.
    """
    org = session.get(Organisation, org_id)
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="organisation not found")
    datasets = session.scalars(
        select(Dataset)
        .where(Dataset.org_id == org_id, Dataset.status == DatasetStatus.PUBLISHED.value)
        .order_by(Dataset.created_at)
    ).all()
    graph = new_graph()
    subjects: list[URIRef] = []
    for ds in datasets:
        subject = dataset_iri(org_id, ds.id)
        add_dataset(graph, subject, _metadata(ds))
        subjects.append(subject)
    add_catalogue(graph, catalogue_iri(org_id), org.name, subjects)
    name = f"{slugify(org.name) or 'organisation'}-catalogue"
    return _file_response(graph, export_format, name)
