from enum import StrEnum

from pydantic import Field

from relay.dtos.base import DTO


class ExportFormat(StrEnum):
    """RDF serialisation of a Health DCAT-AP record."""

    TTL = "ttl"
    JSONLD = "jsonld"
    RDFXML = "rdfxml"


# Media type for each format, used in the response and for download file names
EXPORT_MEDIA_TYPES: dict[ExportFormat, str] = {
    ExportFormat.TTL: "text/turtle",
    ExportFormat.JSONLD: "application/ld+json",
    ExportFormat.RDFXML: "application/rdf+xml",
}

# File extension for downloads, the same the web app uses
EXPORT_EXTENSIONS: dict[ExportFormat, str] = {
    ExportFormat.TTL: "ttl",
    ExportFormat.JSONLD: "jsonld",
    ExportFormat.RDFXML: "rdf",
}

EXPORT_RESPONSES: dict[int | str, dict[str, object]] = {
    200: {
        "description": "The record in the requested serialisation",
        "content": {media_type: {} for media_type in EXPORT_MEDIA_TYPES.values()},
    },
}


class ValidationSeverity(StrEnum):
    VIOLATION = "violation"
    WARNING = "warning"
    INFO = "info"


class ValidationViolationDTO(DTO):
    path: str | None = Field(description="Property the result is about, e.g. dct:title")
    field: str | None = Field(
        default=None,
        description="Top-level form field key the result is about, e.g. distributions",
    )
    message: str = Field(description="What is wrong, in plain words")
    severity: ValidationSeverity


class ValidationReportDTO(DTO):
    """Outcome of validating a dataset's record against the Health DCAT-AP shapes."""

    conforms: bool
    missing: list[str] = Field(description="Mandatory fields not filled in yet, by form field key")
    violations: list[ValidationViolationDTO]
