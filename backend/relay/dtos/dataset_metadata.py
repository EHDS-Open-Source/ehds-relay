"""HealthDCAT-AP release 8 metadata for a dataset (a 27-field core subset).

Every field is optional so a draft can be saved incrementally; `missing_for_publish`
lists what is still required before a dataset can be published. Mandatory in the spec:
title, description, identifier, access rights, applicable legislation, health category,
health data access body and structured data; `variables` becomes mandatory when
structured data is true.
"""

from datetime import date, datetime
from typing import Annotated, Self

from pydantic import AnyUrl, BaseModel, ConfigDict, Field, StringConstraints, model_validator

# Deliberately permissive: an unquoted local part without whitespace or "@", or a quoted one
# (which may contain spaces and "@"); unicode is allowed. Then a domain with no "@" or
# whitespace (dotless hosts and IP literals are valid too). Full RFC 5322 validation is left
# to whoever delivers the mail.
Email = Annotated[
    str,
    StringConstraints(
        pattern=r'^(?:"[^"]+"|[^\s@"][^\s@]*)@[^@\s]+$', max_length=254, strip_whitespace=False
    ),
]


class _Meta(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Agent(_Meta):
    """foaf:Agent (publisher, creator, health data access body)."""

    name: str = Field(min_length=1)
    url: AnyUrl | None = None
    email: Email | None = None


class ContactPoint(_Meta):
    """vcard:Kind. At least one of email or contact_page is required."""

    name: str | None = None
    email: Email | None = Field(default=None, description="vcard:hasEmail")
    contact_page: AnyUrl | None = Field(default=None, description="vcard:hasURL")

    @model_validator(mode="after")
    def _needs_a_channel(self) -> Self:
        if self.email is None and self.contact_page is None:
            raise ValueError("contact point needs an email or a contact_page")
        return self


class Distribution(_Meta):
    """dcat:Distribution."""

    title: str | None = Field(default=None, description="dct:title")
    description: str | None = Field(default=None, description="dct:description")
    access_url: list[AnyUrl] = Field(min_length=1, description="dcat:accessURL")
    download_url: list[AnyUrl] = Field(default_factory=list[AnyUrl], description="dcat:downloadURL")
    applicable_legislation: list[AnyUrl] = Field(
        min_length=1, description="r5r:applicableLegislation"
    )
    format: str | None = Field(default=None, description="dct:format")
    media_type: str | None = Field(default=None, description="dcat:mediaType")
    byte_size: int | None = Field(default=None, ge=0, description="dcat:byteSize")
    licence: AnyUrl | None = Field(default=None, description="dct:license")
    release_date: date | None = None
    modification_date: date | None = None


class Column(_Meta):
    """csvw:Column."""

    name: str = Field(min_length=1, description="csvw:name")
    titles: list[str] = Field(min_length=1, description="csvw:titles")
    description: list[str] = Field(min_length=1, description="dct:description")
    datatype: str = Field(min_length=1, description="csvw:datatype")
    property_url: AnyUrl | None = Field(default=None, description="csvw:propertyUrl")


class Table(_Meta):
    """csvw:Table."""

    title: list[str] = Field(min_length=1)
    url: AnyUrl | None = None
    keyword: list[str] = Field(default_factory=list[str])
    column: list[Column] = Field(min_length=1)


class Variables(_Meta):
    """csvw:TableGroup: the variables of a structured dataset."""

    title: list[str] = Field(min_length=1)
    table: list[Table] = Field(min_length=1)


class DatasetMetadata(_Meta):
    # Mandatory in HealthDCAT-AP
    title: str | None = Field(default=None, description="dct:title")
    description: str | None = Field(default=None, description="dct:description")
    identifier: list[str] = Field(default_factory=list[str], description="dct:identifier")
    access_rights: AnyUrl | None = Field(default=None, description="dct:accessRights")
    applicable_legislation: list[AnyUrl] = Field(
        default_factory=list[AnyUrl], description="r5r:applicableLegislation"
    )
    health_category: list[AnyUrl] = Field(default_factory=list[AnyUrl])
    health_data_access_body: Agent | None = None
    structured_data: bool | None = Field(default=None, description="healthdcatap:hasStructuredData")
    variables: Variables | None = Field(default=None, description="healthdcatap:hasVariables")

    # Repeatable groups
    distributions: list[Distribution] = Field(
        default_factory=list[Distribution], description="dcat:distribution"
    )
    contact_points: list[ContactPoint] = Field(
        default_factory=list[ContactPoint], description="dcat:contactPoint"
    )

    # Optional
    publisher: Agent | None = Field(default=None, description="dct:publisher")
    creator: list[Agent] = Field(default_factory=list[Agent], description="dct:creator")
    health_theme: list[AnyUrl] = Field(default_factory=list[AnyUrl])
    keyword: list[str] = Field(default_factory=list[str], description="dcat:keyword")
    language: list[str] = Field(default_factory=list[str], description="dct:language")
    frequency: AnyUrl | None = Field(default=None, description="dct:accrualPeriodicity")
    geographical_coverage: list[AnyUrl] = Field(
        default_factory=list[AnyUrl], description="dct:spatial"
    )
    temporal_coverage: list[str] = Field(
        default_factory=list[str], description="dct:temporal, e.g. 2020-01-01/2022-12-31"
    )
    release_date: datetime | date | None = Field(default=None, description="dct:issued")
    modification_date: datetime | date | None = Field(default=None, description="dct:modified")
    dataset_version: str | None = Field(default=None, description="dcat:version")
    population_coverage: list[str] = Field(default_factory=list[str])
    minimum_typical_age: int | None = Field(default=None, ge=0)
    maximum_typical_age: int | None = Field(default=None, ge=0)
    number_of_records: int | None = Field(default=None, ge=0)
    number_of_unique_individuals: int | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def _age_range(self) -> Self:
        lo, hi = self.minimum_typical_age, self.maximum_typical_age
        if lo is not None and hi is not None and lo > hi:
            raise ValueError("minimum_typical_age must not exceed maximum_typical_age")
        return self

    def missing_for_publish(self) -> list[str]:
        missing: list[str] = []
        if not (self.title and self.title.strip()):
            missing.append("title")
        if not (self.description and self.description.strip()):
            missing.append("description")
        if not self.identifier:
            missing.append("identifier")
        if self.access_rights is None:
            missing.append("access_rights")
        if not self.applicable_legislation:
            missing.append("applicable_legislation")
        if not self.health_category:
            missing.append("health_category")
        if self.health_data_access_body is None:
            missing.append("health_data_access_body")
        if self.structured_data is None:
            missing.append("structured_data")
        elif self.structured_data and self.variables is None:
            missing.append("variables")
        return missing
