"""Health DCAT-AP mapping: generated graphs must match the hand-written golden Turtle.

Graphs are compared for isomorphism (blank nodes matched structurally), not as strings,
so serialiser ordering and blank-node labels do not matter.
"""

import json
from collections.abc import Callable
from pathlib import Path

import pytest
from rdflib import Graph, URIRef
from rdflib.compare import graph_diff, isomorphic, to_isomorphic
from rdflib.namespace import RDF

from relay.dtos.dataset_metadata import DatasetMetadata
from relay.rdf import (
    JSONLD_MEDIA_TYPE,
    RDFXML_MEDIA_TYPE,
    TURTLE_MEDIA_TYPE,
    add_dataset,
    dataset_graph,
    new_graph,
    to_jsonld,
    to_rdfxml,
    to_turtle,
)
from relay.rdf.vocab import DCAT, HEALTH_DATA_THEME, PREFIXES

GOLDEN = Path(__file__).parent / "golden"
BASE = "https://relay.example.org/datasets/"

# golden file stem -> dataset IRI used in its expected Turtle
CASES = {
    "non_public_full": URIRef(BASE + "oncology-ehrs-2024"),
    "public_minimal": URIRef(BASE + "bed-occupancy"),
}


# format name -> (serialiser, rdflib parser name)
FORMATS: dict[str, tuple[Callable[[Graph], str], str]] = {
    "turtle": (to_turtle, "turtle"),
    "jsonld": (to_jsonld, "json-ld"),
    "rdfxml": (to_rdfxml, "xml"),
}


def round_trip(graph: Graph, fmt: str) -> Graph:
    serialise, parser = FORMATS[fmt]
    return Graph().parse(data=serialise(graph), format=parser)


def load_metadata(name: str) -> DatasetMetadata:
    return DatasetMetadata.model_validate(json.loads((GOLDEN / f"{name}.json").read_text()))


def load_expected(name: str) -> Graph:
    return Graph().parse(GOLDEN / f"{name}.ttl", format="turtle")


def assert_same_graph(actual: Graph, expected: Graph) -> None:
    if isomorphic(actual, expected):
        return
    _, only_actual, only_expected = graph_diff(to_isomorphic(actual), to_isomorphic(expected))
    pytest.fail(
        "graphs differ\n--- only in generated ---\n"
        + only_actual.serialize(format="nt")
        + "\n--- only in golden ---\n"
        + only_expected.serialize(format="nt")
    )


@pytest.mark.parametrize("name", CASES)
def test_golden_examples(name: str) -> None:
    graph = dataset_graph(CASES[name], load_metadata(name))
    assert_same_graph(graph, load_expected(name))


@pytest.mark.parametrize("fmt", FORMATS)
@pytest.mark.parametrize("name", CASES)
def test_golden_examples_round_trip(name: str, fmt: str) -> None:
    graph = dataset_graph(CASES[name], load_metadata(name))
    assert_same_graph(round_trip(graph, fmt), load_expected(name))


def test_turtle_declares_spec_prefixes() -> None:
    turtle = to_turtle(dataset_graph(CASES["non_public_full"], load_metadata("non_public_full")))
    for prefix in ("dcat", "dct", "dcatap", "healthdcatap", "geodcatap", "cv", "csvw", "dpv"):
        assert f"@prefix {prefix}: <{PREFIXES[prefix]}>" in turtle


def catalogue() -> tuple[Graph, Graph]:
    g = new_graph()
    expected = Graph()
    for name, subject in CASES.items():
        add_dataset(g, subject, load_metadata(name))
        expected += load_expected(name)
    return g, expected


def test_catalogue_graph_holds_several_datasets() -> None:
    g, expected = catalogue()
    assert set(g.subjects(RDF.type, DCAT.Dataset)) == set(CASES.values())
    assert_same_graph(g, expected)


@pytest.mark.parametrize("fmt", FORMATS)
def test_catalogue_round_trips(fmt: str) -> None:
    g, expected = catalogue()
    assert_same_graph(round_trip(g, fmt), expected)


@pytest.mark.parametrize("fmt", FORMATS)
def test_empty_draft_round_trips(fmt: str) -> None:
    g = dataset_graph(URIRef(BASE + "empty"), DatasetMetadata())
    assert_same_graph(round_trip(g, fmt), g)


def test_media_types() -> None:
    assert TURTLE_MEDIA_TYPE == "text/turtle"
    assert JSONLD_MEDIA_TYPE == "application/ld+json"
    assert RDFXML_MEDIA_TYPE == "application/rdf+xml"


def test_jsonld_has_inline_prefix_context_and_compact_keys() -> None:
    graph = dataset_graph(CASES["non_public_full"], load_metadata("non_public_full"))
    doc = json.loads(to_jsonld(graph))
    assert doc["@context"] == {p: str(ns) for p, ns in PREFIXES.items()}
    keys = {k for node in doc["@graph"] for k in node}
    assert "dct:title" in keys
    assert not any(k.startswith("http") for k in keys)


def test_rdfxml_declares_spec_prefixes() -> None:
    xml = to_rdfxml(dataset_graph(CASES["non_public_full"], load_metadata("non_public_full")))
    for prefix in ("dcat", "dct", "dcatap", "healthdcatap", "geodcatap", "cv", "csvw", "dpv"):
        assert f'xmlns:{prefix}="{PREFIXES[prefix]}"' in xml


@pytest.mark.parametrize("serialise", [to_jsonld, to_rdfxml])
def test_non_ascii_text_is_not_escaped(serialise: Callable[[Graph], str]) -> None:
    g = dataset_graph(CASES["non_public_full"], load_metadata("non_public_full"))
    non_ascii = {str(o) for o in g.objects() if any(ord(c) > 127 for c in str(o))}
    assert non_ascii
    out = serialise(g)
    assert all(text in out for text in non_ascii)


def test_empty_draft_maps_to_dataset_with_fixed_theme() -> None:
    subject = URIRef(BASE + "empty")
    g = dataset_graph(subject, DatasetMetadata())
    assert set(g) == {
        (subject, RDF.type, DCAT.Dataset),
        (subject, DCAT.theme, HEALTH_DATA_THEME),
    }
