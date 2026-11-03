"""Validation against the vendored Health DCAT-AP release 8 SHACL shapes (offline)."""

import json
import socket
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest
from rdflib import Graph, URIRef

from relay.domain.datasets import AccessRights
from relay.dtos.dataset_metadata import DatasetMetadata
from relay.rdf import add_catalogue, dataset_graph, new_graph
from relay.rdf.validate import SHAPE_FILES, SHAPES_DIR, Finding, shapes_graph, validate_graph
from relay.rdf.vocab import DCAT, DCATAP, DCT

GOLDEN = Path(__file__).parent / "golden"
SUBJECT = URIRef("https://relay.example.org/datasets/x")

# golden file stem -> its access level, which picks the shape set
CASES = {
    "public_minimal": AccessRights.PUBLIC,
    "non_public_full": AccessRights.NON_PUBLIC,
}


@pytest.fixture(autouse=True)
def no_network(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    """Validation must never reach the network (owl:imports in the shapes are not followed)."""

    def refuse(*_args: Any, **_kwargs: Any) -> None:
        raise AssertionError("validation tried to open a network connection")

    monkeypatch.setattr(socket, "create_connection", refuse)
    monkeypatch.setattr(socket.socket, "connect", refuse)
    yield


def golden_doc(name: str) -> dict[str, Any]:
    doc: dict[str, Any] = json.loads((GOLDEN / f"{name}.json").read_text())
    return doc


def findings(doc: dict[str, Any], edit: Any = None) -> list[Finding]:
    meta = DatasetMetadata.model_validate(doc)
    assert meta.access_rights is not None
    graph = dataset_graph(SUBJECT, meta)
    if edit is not None:
        edit(graph)
    return validate_graph(graph, SUBJECT, meta.access_rights)


@pytest.mark.parametrize("name", CASES)
def test_golden_examples_conform(name: str) -> None:
    doc = golden_doc(name)
    assert DatasetMetadata.model_validate(doc).access_rights == CASES[name]
    assert findings(doc) == []


@pytest.mark.parametrize("level", list(AccessRights))
def test_every_shape_set_loads(level: AccessRights) -> None:
    assert len(shapes_graph(level)) > 0
    assert (SHAPES_DIR / SHAPE_FILES[level]).is_file()


def test_access_level_must_match_shape_set() -> None:
    doc = golden_doc("public_minimal")
    meta = DatasetMetadata.model_validate(doc)
    graph = dataset_graph(SUBJECT, meta)
    [finding] = validate_graph(graph, SUBJECT, AccessRights.RESTRICTED)
    assert finding.field == "access_rights"
    assert finding.path == "dct:accessRights"
    assert "restricted" in finding.message


def test_structured_data_without_variables_is_readable() -> None:
    doc: dict[str, Any] = golden_doc("non_public_full") | {"variables": []}
    [finding] = findings(doc)
    assert finding == Finding(
        severity="violation",
        message=(
            "Variables are required when the dataset has structured data. "
            "Add the variables, or answer no to structured data."
        ),
        path=None,
        field="variables",
    )


def test_missing_property_is_tied_to_its_field() -> None:
    def drop_identifier(g: Graph) -> None:
        g.remove((SUBJECT, DCT.identifier, None))

    [finding] = findings(golden_doc("public_minimal"), drop_identifier)
    assert finding == Finding(
        "violation", "The identifier is missing.", "dct:identifier", "identifier"
    )


def test_nested_failure_names_the_part_and_its_field() -> None:
    def drop_distribution_legislation(g: Graph) -> None:
        for dist in list(g.objects(SUBJECT, DCAT.distribution)):
            g.remove((dist, DCATAP.applicableLegislation, None))

    [finding] = findings(golden_doc("non_public_full"), drop_distribution_legislation)
    assert finding.message == "In a distribution: the applicable legislation is missing."
    assert finding.field == "distributions"


def test_messages_hold_no_raw_rdf() -> None:
    def break_things(g: Graph) -> None:
        g.remove((SUBJECT, DCT.identifier, None))
        g.remove((SUBJECT, DCAT.keyword, None))
        for dist in list(g.objects(SUBJECT, DCAT.distribution)):
            g.remove((dist, DCATAP.applicableLegislation, None))

    result = findings(golden_doc("non_public_full") | {"variables": list[str]()}, break_things)
    assert len(result) == 4
    for finding in result:
        assert "http" not in finding.message
        assert ":" not in finding.message.removeprefix("In a distribution:")


@pytest.mark.parametrize("level", list(AccessRights))
def test_empty_catalogue_conforms(level: AccessRights) -> None:
    g = new_graph()
    catalogue = URIRef("https://relay.example.org/catalogue")
    add_catalogue(g, catalogue, "Acme Health", [])
    assert validate_graph(g, catalogue, level) == []
