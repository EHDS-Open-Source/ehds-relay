"""Check a dataset's graph against the official Health DCAT-AP release 8 SHACL shapes.

The shapes are vendored in ``shapes/`` (see its README), so validation never touches the
network. Each SHACL result is put into plain words and tied to the form field it is about,
so people who never see RDF can act on it.
"""

import re
from collections import deque
from dataclasses import dataclass
from functools import cache
from pathlib import Path
from typing import cast

from pyshacl import validate  # pyright: ignore[reportUnknownVariableType]
from rdflib import BNode, Graph, Literal, Node, URIRef
from rdflib.collection import Collection
from rdflib.namespace import RDF, SH

from relay.domain.datasets import AccessRights
from relay.rdf.mapping import new_graph
from relay.rdf.vocab import (
    ACCESS_RIGHTS_URI,
    CSVW,
    CV,
    DATASET_COUNT_FIELDS,
    DATASET_LITERAL_FIELDS,
    DATASET_ORGANISATION_FIELDS,
    DATASET_TERM_FIELDS,
    DCAT,
    DCATAP,
    DCT,
    DPV,
    ELI,
    FOAF,
    GEODCATAP,
    HEALTHDCATAP,
    PROV,
    RDFS,
    SKOS,
    VCARD,
    XSD,
)

SHAPES_DIR = Path(__file__).parent / "shapes"

SHAPE_FILES: dict[AccessRights, str] = {
    AccessRights.PUBLIC: "public-shapes.ttl",
    AccessRights.RESTRICTED: "restricted-shapes.ttl",
    AccessRights.NON_PUBLIC: "non-public-shapes.ttl",
}
RANGE_FILE = "range.ttl"


@dataclass(frozen=True)
class Finding:
    """One SHACL result in plain words."""

    severity: str  # "violation", "warning" or "info"
    message: str
    # Compact property name, e.g. "dct:title"; None for a rule about the whole record
    path: str | None
    # Top-level form field key, e.g. "distributions"; None when no field matches
    field: str | None


@cache
def shapes_graph(level: AccessRights) -> Graph:
    """The shape set for one access level plus the class range shapes (parsed once)."""
    g = Graph()
    g.parse(SHAPES_DIR / SHAPE_FILES[level], format="turtle")
    g.parse(SHAPES_DIR / RANGE_FILE, format="turtle")
    return g


def validate_graph(data: Graph, dataset: URIRef, level: AccessRights) -> list[Finding]:
    """Validate `data` (describing `dataset`) against the shapes for `level`.

    No inference and no ``owl:imports``: only what the graph says is checked, offline.
    """
    shapes = shapes_graph(level)
    # Without serialisation options pyshacl returns (conforms, results graph, text)
    outcome = cast(
        tuple[bool, Graph, str],
        validate(
            data,
            shacl_graph=shapes,
            inference="none",
            do_owl_imports=False,
            allow_infos=True,
            allow_warnings=True,
        ),
    )
    results = outcome[1]
    return _Translator(data, shapes, results, dataset).findings()


# Field key of each property linking the dataset to something, for tying results to the form
_FIELD_OF_PREDICATE: dict[Node, str] = {
    DCT.title: "title",
    DCT.description: "description",
    DCAT.distribution: "distributions",
    HEALTHDCATAP.hasStructuredData: "structured_data",
    HEALTHDCATAP.hasVariables: "variables",
    DCT.provenance: "provenance",
    DPV.hasPersonalData: "has_personal_data",
    DCT.accessRights: "access_rights",
    DCT.temporal: "temporal_coverage",
    DCAT.contactPoint: "contact_points",
    **{prop.predicate: field for field, prop in DATASET_TERM_FIELDS.items()},
    **{predicate: field for field, predicate in DATASET_LITERAL_FIELDS.items()},
    **{predicate: field for field, predicate in DATASET_COUNT_FIELDS.items()},
    **{predicate: field for field, predicate in DATASET_ORGANISATION_FIELDS.items()},
}

# Plain names of properties as used in messages
_PROPERTY_NAMES: dict[Node, str] = {
    DCT.title: "title",
    DCT.description: "description",
    DCT.identifier: "identifier",
    DCAT.keyword: "keyword",
    DCT.accessRights: "access level",
    DCATAP.applicableLegislation: "applicable legislation",
    DCAT.distribution: "distribution",
    DCAT.theme: "theme",
    HEALTHDCATAP.hdab: "health data access body",
    HEALTHDCATAP.hdabCoordinator: "health data access body coordinator",
    GEODCATAP.custodian: "health data holder",
    DCT.publisher: "publisher",
    HEALTHDCATAP.healthCategory: "health category",
    HEALTHDCATAP.healthTheme: "health theme",
    HEALTHDCATAP.hasStructuredData: "structured data answer (yes or no)",
    HEALTHDCATAP.hasVariables: "variables",
    HEALTHDCATAP.hasCodingSystem: "coding system",
    HEALTHDCATAP.hasCodeValues: "code values",
    HEALTHDCATAP.numberOfRecords: "number of records",
    HEALTHDCATAP.numberOfUniqueIndividuals: "number of unique individuals",
    DCAT.contactPoint: "contact point",
    DCT.type: "type",
    DCT.provenance: "provenance",
    DCT.conformsTo: "standard it conforms to",
    DCT.language: "language",
    DCT.spatial: "geographical coverage",
    DCT.temporal: "temporal coverage",
    DCT["format"]: "format",
    DCAT.accessURL: "access URL",
    PROV.wasGeneratedBy: "activity that generated it",
    CV.contactPoint: "contact point",
    CV.email: "email address",
    CV.contactPage: "contact page",
    VCARD.hasEmail: "email address",
    VCARD.hasURL: "web page",
    VCARD.fn: "name",
    FOAF.name: "name",
    CSVW.table: "table",
    CSVW.column: "column",
    CSVW.name: "name",
    CSVW.title: "title",
    CSVW.datatype: "data type",
    CSVW.propertyUrl: "coding system",
}

# What a nested thing is, by its class, for "In a distribution: ..."
_THING_NAMES: dict[Node, str] = {
    DCAT.Distribution: "a distribution",
    FOAF.Agent: "an organisation",
    CV.ContactPoint: "an organisation's contact point",
    VCARD.Kind: "a contact point",
    CSVW.TableGroup: "the variables",
    CSVW.Table: "the variables",
    CSVW.Column: "a variable",
    DCT.PeriodOfTime: "the temporal coverage",
    DCAT.Catalog: "the catalogue",
}

# Plain names of classes, for "must be a ..."
_CLASS_NAMES: dict[Node, str] = {
    SKOS.Concept: "term from a vocabulary",
    FOAF.Agent: "organisation",
    CV.ContactPoint: "contact point",
    VCARD.Kind: "contact point",
    DCAT.Distribution: "distribution",
    DCT.Standard: "standard",
    DCT.LinguisticSystem: "language",
    DCT.Location: "place",
    DCT.MediaTypeOrExtent: "file format",
    DCT.RightsStatement: "access level",
    DCT.ProvenanceStatement: "provenance statement",
    DCT.PeriodOfTime: "period of time",
    ELI.LegalResource: "piece of legislation",
    PROV.Activity: "activity",
    CSVW.TableGroup: "set of variables",
}

_DATATYPE_NAMES: dict[Node, str] = {
    XSD.boolean: "yes or no",
    XSD.nonNegativeInteger: "whole number of 0 or more",
    XSD.integer: "whole number",
    XSD.date: "date",
    XSD.dateTime: "date and time",
    XSD.string: "text",
}

_NODE_KIND_MESSAGES: dict[Node, str] = {
    SH.IRI: "must be a link, not text",
    SH.Literal: "must be text, not a link",
    SH.BlankNodeOrIRI: "must be a link or a described item, not text",
    SH.BlankNode: "must be a described item",
}

_SEVERITIES: dict[Node, str] = {
    SH.Violation: "violation",
    SH.Warning: "warning",
    SH.Info: "info",
}

_ACCESS_LEVEL_NAMES: dict[Node, str] = {
    uri: level.value.replace("_", "-") for level, uri in ACCESS_RIGHTS_URI.items()
}

# The rule "structured data needs variables" sits on the dataset shape itself, as an sh:or
_STRUCTURED_DATA_RULE = (
    "Variables are required when the dataset has structured data. "
    "Add the variables, or answer no to structured data."
)


def _words(local_name: str) -> str:
    """ "hasStructuredData" -> "has structured data"."""
    return re.sub(r"(?<=[a-z0-9])(?=[A-Z])", " ", local_name).lower()


def _local_name(uri: Node) -> str:
    return re.split(r"[/#]", str(uri).rstrip("/#"))[-1]


class _Translator:
    def __init__(self, data: Graph, shapes: Graph, results: Graph, dataset: URIRef) -> None:
        self.data = data
        self.shapes = shapes
        self.results = results
        self.dataset = dataset
        self.prefixes = new_graph().namespace_manager

    def findings(self) -> list[Finding]:
        reported_values = {
            self.results.value(r, SH.focusNode)
            for r in self.results.subjects(RDF.type, SH.ValidationResult)
        }
        seen: set[Finding] = set()
        for result in self.results.subjects(RDF.type, SH.ValidationResult):
            component = self.results.value(result, SH.sourceConstraintComponent)
            value = self.results.value(result, SH.value)
            # "Value does not meet shape X" adds nothing when X's own results are reported
            if component == SH.NodeConstraintComponent and value in reported_values:
                continue
            seen.add(self._finding(result))
        rank = {"violation": 0, "warning": 1, "info": 2}
        return sorted(seen, key=lambda f: (rank[f.severity], f.field or "~", f.message))

    def _finding(self, result: Node) -> Finding:
        focus = self.results.value(result, SH.focusNode)
        path = self.results.value(result, SH.resultPath)
        shape = self.results.value(result, SH.sourceShape)
        component = self.results.value(result, SH.sourceConstraintComponent)
        severity = _SEVERITIES.get(
            self.results.value(result, SH.resultSeverity) or SH.Violation, "violation"
        )

        if focus == self.dataset and path is None and component == SH.OrConstraintComponent:
            return Finding(severity, _STRUCTURED_DATA_RULE, None, "variables")

        problem = self._problem(component, shape, path)
        thing = self._thing(focus)
        message = f"In {thing}: {problem}." if thing else f"{problem[0].upper()}{problem[1:]}."
        return Finding(severity, message, self._compact(path), self._field(focus, path))

    def _problem(self, component: Node | None, shape: Node | None, path: Node | None) -> str:
        name = self._path_name(path)

        def param(p: URIRef) -> Node | None:
            return self.shapes.value(shape, p) if shape is not None else None

        if component == SH.MinCountConstraintComponent:
            count = _int(param(SH.minCount))
            return f"the {name} is missing" if count <= 1 else f"needs at least {count} {name}"
        if component == SH.MaxCountConstraintComponent:
            count = _int(param(SH.maxCount))
            if count == 0:
                return f"the {name} must not be given"
            return f"only one {name} is allowed" if count == 1 else f"at most {count} {name}"
        if component == SH.HasValueConstraintComponent:
            return f"the {name} must be {self._value_name(param(SH.hasValue))}"
        if component == SH.InConstraintComponent:
            return f"the {name} is not one of the allowed values"
        if component == SH.DatatypeConstraintComponent:
            kind = _DATATYPE_NAMES.get(param(SH.datatype) or XSD.string, "value of the right kind")
            return (
                f"the {name} must be {kind}"
                if kind == "yes or no"
                else f"the {name} must be a {kind}"
            )
        if component == SH.NodeKindConstraintComponent:
            kind = param(SH.nodeKind) or SH.IRI
            rule = _NODE_KIND_MESSAGES.get(kind, "has the wrong kind of value")
            return f"the {name} {rule}"
        if component == SH.ClassConstraintComponent:
            cls = param(SH["class"])
            what = _CLASS_NAMES.get(cls, _words(_local_name(cls))) if cls is not None else "item"
            return f"the {name} must be a {what}"
        if component == SH.NodeConstraintComponent:
            return f"the {name} is incomplete"
        return f"the {name} does not meet a rule of the specification"

    def _path_name(self, path: Node | None) -> str:
        if path is None:
            return "record"
        if isinstance(path, BNode):
            alternatives = self.shapes.value(path, SH.alternativePath)
            if alternatives is not None:
                names = [self._path_name(p) for p in Collection(self.shapes, alternatives)]
                return " or ".join(names)
            return "value"
        return _PROPERTY_NAMES.get(path, _words(_local_name(path)))

    def _value_name(self, value: Node | None) -> str:
        if value is None:
            return "a set value"
        if value in _ACCESS_LEVEL_NAMES:
            return f"{_ACCESS_LEVEL_NAMES[value]}, to match this set of rules"
        if isinstance(value, Literal):
            if value.datatype == XSD.boolean:
                return "yes" if value.toPython() else "no"
            return f'"{value}"'
        label = self.data.value(value, SKOS.prefLabel) or self.data.value(value, RDFS.label)
        return f'"{label}"' if label is not None else _words(_local_name(value))

    def _thing(self, focus: Node | None) -> str | None:
        if focus is None or focus == self.dataset:
            return None
        for cls in self.data.objects(focus, RDF.type):
            if cls in _THING_NAMES:
                return _THING_NAMES[cls]
        return "a part of the record"

    def _compact(self, path: Node | None) -> str | None:
        if path is None:
            return None
        if isinstance(path, BNode):
            alternatives = self.shapes.value(path, SH.alternativePath)
            if alternatives is None:
                return None
            return " | ".join(
                p for p in (self._compact(a) for a in Collection(self.shapes, alternatives)) if p
            )
        return path.n3(self.prefixes)

    def _field(self, focus: Node | None, path: Node | None) -> str | None:
        """The form field: the property the dataset reaches the failing node through."""
        if focus is None:
            return None
        if focus == self.dataset:
            return _FIELD_OF_PREDICATE.get(path) if path is not None else None
        # Walk back from the nested node to the dataset, breadth first
        queue: deque[Node] = deque([focus])
        seen = {focus}
        while queue:
            node = queue.popleft()
            for subject, predicate in self.data.subject_predicates(node):
                if subject == self.dataset:
                    return _FIELD_OF_PREDICATE.get(predicate)
                if subject not in seen:
                    seen.add(subject)
                    queue.append(subject)
        return None


def _int(value: Node | None) -> int:
    return int(value.toPython()) if isinstance(value, Literal) else 0


__all__ = ["SHAPE_FILES", "Finding", "shapes_graph", "validate_graph"]
