"""Health DCAT-AP mapping: generated graphs must match the hand-written golden Turtle.

Graphs are compared for isomorphism (blank nodes matched structurally), not as strings,
so serialiser ordering and blank-node labels do not matter.
"""

import json
from pathlib import Path

import pytest
from rdflib import Graph, URIRef
from rdflib.compare import graph_diff, isomorphic, to_isomorphic
from rdflib.namespace import RDF

from relay.dtos.dataset_metadata import DatasetMetadata
from relay.rdf import add_dataset, dataset_graph, new_graph, to_turtle
from relay.rdf.vocab import DCAT, HEALTH_DATA_THEME, PREFIXES

GOLDEN = Path(__file__).parent / "golden"
BASE = "https://relay.example.org/datasets/"

# golden file stem -> dataset IRI used in its expected Turtle
CASES = {
    "non_public_full": URIRef(BASE + "oncology-ehrs-2024"),
    "public_minimal": URIRef(BASE + "bed-occupancy"),
}


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


@pytest.mark.parametrize("name", CASES)
def test_turtle_round_trips(name: str) -> None:
    graph = dataset_graph(CASES[name], load_metadata(name))
    parsed = Graph().parse(data=to_turtle(graph), format="turtle")
    assert_same_graph(parsed, graph)


def test_turtle_declares_spec_prefixes() -> None:
    turtle = to_turtle(dataset_graph(CASES["non_public_full"], load_metadata("non_public_full")))
    for prefix in ("dcat", "dct", "dcatap", "healthdcatap", "geodcatap", "cv", "csvw", "dpv"):
        assert f"@prefix {prefix}: <{PREFIXES[prefix]}>" in turtle


def test_catalogue_graph_holds_several_datasets() -> None:
    g = new_graph()
    expected = Graph()
    for name, subject in CASES.items():
        add_dataset(g, subject, load_metadata(name))
        expected += load_expected(name)
    assert set(g.subjects(RDF.type, DCAT.Dataset)) == set(CASES.values())
    assert_same_graph(g, expected)


def test_empty_draft_maps_to_dataset_with_fixed_theme() -> None:
    subject = URIRef(BASE + "empty")
    g = dataset_graph(subject, DatasetMetadata())
    assert set(g) == {
        (subject, RDF.type, DCAT.Dataset),
        (subject, DCAT.theme, HEALTH_DATA_THEME),
    }
