"""Health DCAT-AP release 8 metadata for a dataset: the 27 fields of the EU minimum metadata.

Every field is optional so a draft can be saved incrementally; `missing_for_publish`
lists what is still required before a dataset can be published. The field names are
stable keys the form uses to link a missing field to its input.

Vocabulary-backed values are `Term`s (a label plus the term's URI), so a hosted
vocabulary lookup can fill the same shape that manual name + URL entry does.
The mapping to RDF lives in `relay.rdf`.
"""

from datetime import date
from typing import Annotated, Self

from pydantic import AnyUrl, BaseModel, ConfigDict, Field, StringConstraints, model_validator
from rdflib import Graph

from relay.domain.datasets import AccessRights

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

# BCP 47 language tag, e.g. "en", "fr", "pt-BR"
LanguageTag = Annotated[str, StringConstraints(pattern=r"^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{1,8})*$")]

NonEmpty = Annotated[str, StringConstraints(min_length=1)]


class _Meta(BaseModel):
    model_config = ConfigDict(extra="forbid")


class LangText(_Meta):
    """A text in one language."""

    lang: LanguageTag = "en"
    text: NonEmpty


class Term(_Meta):
    """A controlled-vocabulary term or other named web resource: a label and its URI."""

    label: NonEmpty
    uri: AnyUrl


class ContactPoint(_Meta):
    name: NonEmpty
    email: Email


class Organisation(_Meta):
    """An organisation: health data access body or health data holder."""

    name: NonEmpty
    type: Term | None = None
    contact_point: ContactPoint | None = None


class Publisher(Organisation):
    description: str | None = None


class Distribution(_Meta):
    title: str | None = None
    description: str | None = None
    access_url: AnyUrl
    format: Term | None = None
    applicable_legislation: list[Term] = Field(min_length=1)


class Variable(_Meta):
    """One variable (column) of a structured dataset."""

    name: NonEmpty
    data_type: NonEmpty = Field(description="e.g. string, integer, boolean, date")
    definition: NonEmpty
    coding_system: AnyUrl | None = Field(
        default=None, description="Coding system or value domain the values come from"
    )


class TemporalCoverage(_Meta):
    start: date | None = None
    end: date | None = None

    @model_validator(mode="after")
    def _ordered(self) -> Self:
        if self.start is not None and self.end is not None and self.start > self.end:
            raise ValueError("temporal coverage start must not be after its end")
        return self


def _first_text(texts: list[LangText], lang: str = "en") -> str | None:
    for t in texts:
        if t.lang == lang:
            return t.text
    return texts[0].text if texts else None


class DatasetMetadata(_Meta):
    # Main
    title: list[LangText] = Field(default_factory=list[LangText])
    description: list[LangText] = Field(default_factory=list[LangText])
    distributions: list[Distribution] = Field(default_factory=list[Distribution])
    structured_data: bool | None = None
    variables: list[Variable] = Field(default_factory=list[Variable])
    provenance: str | None = None
    keyword: list[NonEmpty] = Field(default_factory=list[str])
    health_theme: list[Term] = Field(default_factory=list[Term])
    health_category: list[Term] = Field(default_factory=list[Term])
    coding_system: list[Term] = Field(default_factory=list[Term])
    has_personal_data: bool | None = None
    conforms_to: list[Term] = Field(default_factory=list[Term])

    # Access and governance
    access_rights: AccessRights | None = None
    applicable_legislation: list[Term] = Field(default_factory=list[Term])
    health_data_access_body: Organisation | None = None
    geographical_coverage: list[Term] = Field(default_factory=list[Term])
    type: list[Term] = Field(default_factory=list[Term])

    # Coverage and content
    number_of_records: int | None = Field(default=None, ge=0)
    number_of_unique_individuals: int | None = Field(default=None, ge=0)
    language: list[Term] = Field(default_factory=list[Term])
    code_values: list[NonEmpty] = Field(default_factory=list[str])
    temporal_coverage: TemporalCoverage | None = None

    # Organisations
    health_data_holder: Organisation | None = None
    publisher: Publisher | None = None

    # Technical and contact information
    contact_points: list[ContactPoint] = Field(default_factory=list[ContactPoint])
    identifier: list[NonEmpty] = Field(default_factory=list[str])
    generated_by: list[Term] = Field(default_factory=list[Term])

    # Optional QUANTUM data quality and utility label, pasted as Turtle
    quantum_label: str | None = None

    @model_validator(mode="after")
    def _quantum_label_is_turtle(self) -> Self:
        if self.quantum_label is not None and self.quantum_label.strip():
            try:
                Graph().parse(data=self.quantum_label, format="turtle")
            except Exception as exc:
                raise ValueError(f"quantum_label is not valid Turtle: {exc}") from exc
        return self

    def display_title(self) -> str | None:
        """Title for lists and search: the English one, else the first."""
        return _first_text(self.title)

    def display_description(self) -> str | None:
        return _first_text(self.description)

    def missing_for_publish(self) -> list[str]:
        """Field keys still needed before publishing.

        Fields the EU list qualifies with "where applicable" (coding system, code values,
        geographical and temporal coverage, number of records) are not required. The health
        data access body is required unless access is public, unique individuals only when
        the dataset has personal data, and variables only when it is structured.
        """
        hdab_needed = self.access_rights != AccessRights.PUBLIC
        # (field key, value, required?) in form order
        checks: list[tuple[str, object, bool]] = [
            ("title", self.title, True),
            ("description", self.description, True),
            ("distributions", self.distributions, True),
            ("structured_data", self.structured_data, True),
            ("variables", self.variables, bool(self.structured_data)),
            ("provenance", self.provenance and self.provenance.strip(), True),
            ("keyword", self.keyword, True),
            ("health_theme", self.health_theme, True),
            ("health_category", self.health_category, True),
            ("has_personal_data", self.has_personal_data, True),
            ("conforms_to", self.conforms_to, True),
            ("access_rights", self.access_rights, True),
            ("applicable_legislation", self.applicable_legislation, True),
            ("health_data_access_body", self.health_data_access_body, hdab_needed),
            ("type", self.type, True),
            (
                "number_of_unique_individuals",
                self.number_of_unique_individuals,
                bool(self.has_personal_data),
            ),
            ("language", self.language, True),
            ("health_data_holder", self.health_data_holder, True),
            ("publisher", self.publisher, True),
            ("contact_points", self.contact_points, True),
            ("identifier", self.identifier, True),
            ("generated_by", self.generated_by, True),
        ]
        required = {key: value for key, value, needed in checks if needed}
        missing = [k for k, v in required.items() if v is None or v == [] or v == ""]
        # Organisations need a contact point before they can be published
        for key in ("health_data_access_body", "health_data_holder", "publisher"):
            org: Organisation | None = getattr(self, key)
            if key in required and org is not None and org.contact_point is None:
                missing.append(f"{key}.contact_point")
        return missing
