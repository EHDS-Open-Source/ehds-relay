"""Export of one dataset or the catalogue, and the validation route."""

import json
import uuid
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from rdflib import Graph, Literal, URIRef
from rdflib.namespace import RDF

from relay.dtos.dataset_metadata import DatasetMetadata
from relay.rdf import dataset_graph
from relay.rdf.vocab import DCAT, DCATAP, DCT, EHDS_REGULATION
from relay.settings import get_settings
from tests.conftest import AsUser
from tests.test_rdf import CASES, assert_same_graph, load_expected

GOLDEN = Path(__file__).parent / "golden"

# format query value -> (media type, extension, rdflib parser)
FORMATS = {
    "ttl": ("text/turtle", "ttl", "turtle"),
    "jsonld": ("application/ld+json", "jsonld", "json-ld"),
    "rdfxml": ("application/rdf+xml", "rdf", "xml"),
}

QUANTUM = """
@prefix dqv: <http://www.w3.org/ns/dqv#> .
@prefix ex: <https://quantum.example.org/> .
ex:label-1 a dqv:QualityCertificate ;
    dqv:value "gold" .
"""


def golden_doc(name: str) -> dict[str, Any]:
    doc: dict[str, Any] = json.loads((GOLDEN / f"{name}.json").read_text())
    return doc


def datasets_url(org_id: str) -> str:
    return f"/api/v1/organisations/{org_id}/datasets"


def create(client: TestClient, org_id: str, meta: dict[str, Any], publish: bool = True) -> str:
    res = client.post(datasets_url(org_id), json={"metadata": meta, "publish": publish})
    assert res.status_code == 201, res.text
    return res.json()["id"]


def dataset_iri(org_id: str, dataset_id: str) -> URIRef:
    return URIRef(f"{get_settings().web_base_url}/orgs/{org_id}/datasets/{dataset_id}")


def parse(res: Any, fmt: str) -> Graph:
    return Graph().parse(data=res.text, format=FORMATS[fmt][2])


def renamed(graph: Graph, old: URIRef, new: URIRef) -> Graph:
    """`graph` with `old` replaced by `new`, to compare with golden files using other IRIs."""
    out = Graph()
    for s, p, o in graph:
        out.add((new if s == old else s, p, new if o == old else o))
    return out


@pytest.fixture
def org_id(client: TestClient) -> str:
    res = client.post("/api/v1/organisations", json={"name": "Acme Health", "country": "NL"})
    return res.json()["id"]


# The public golden example is the Health DCAT-AP minimum, which lacks fields the app
# requires before publishing (keyword, publisher...), so only the full one can be exported
# over HTTP; both are checked against their golden files in every format in test_rdf.
FULL = "non_public_full"

# Fills the public example up to what the app requires, keeping its own values
COMPLETE_PUBLIC = {
    k: v
    for k, v in json.loads((GOLDEN / f"{FULL}.json").read_text()).items()
    if k
    in {
        "provenance",
        "keyword",
        "health_theme",
        "conforms_to",
        "type",
        "language",
        "health_data_holder",
        "publisher",
        "contact_points",
        "generated_by",
    }
}


def complete_public() -> dict[str, Any]:
    return golden_doc("public_minimal") | COMPLETE_PUBLIC


@pytest.mark.parametrize("fmt", FORMATS)
def test_export_golden_example(client: TestClient, org_id: str, fmt: str) -> None:
    ds = create(client, org_id, golden_doc(FULL))
    res = client.get(f"{datasets_url(org_id)}/{ds}/export", params={"format": fmt})
    assert res.status_code == 200, res.text
    media_type, ext, _ = FORMATS[fmt]
    assert res.headers["content-type"].split(";")[0] == media_type
    assert res.headers["content-disposition"] == (
        f'attachment; filename="cross-border-oncology-ehr-cohort-2024.{ext}"'
    )
    actual = renamed(parse(res, fmt), dataset_iri(org_id, ds), CASES[FULL])
    assert_same_graph(actual, load_expected(FULL))


def test_public_minimum_alone_is_refused_as_incomplete(client: TestClient, org_id: str) -> None:
    ds = create(client, org_id, golden_doc("public_minimal"), publish=False)
    assert client.get(f"{datasets_url(org_id)}/{ds}/export").status_code == 422


def test_export_defaults_to_turtle_with_slug_file_name(client: TestClient, org_id: str) -> None:
    doc = complete_public() | {"title": [{"lang": "en", "text": "Données Été 2024!"}]}
    ds = create(client, org_id, doc)
    res = client.get(f"{datasets_url(org_id)}/{ds}/export")
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/turtle")
    assert res.headers["content-disposition"] == 'attachment; filename="donnees-ete-2024.ttl"'


def test_export_merges_quantum_label(client: TestClient, org_id: str) -> None:
    ds = create(client, org_id, complete_public() | {"quantum_label": QUANTUM})
    for fmt in FORMATS:
        res = client.get(f"{datasets_url(org_id)}/{ds}/export", params={"format": fmt})
        graph = parse(res, fmt)
        label = URIRef("https://quantum.example.org/label-1")
        assert (label, URIRef("http://www.w3.org/ns/dqv#value"), Literal("gold")) in graph
        assert (dataset_iri(org_id, ds), RDF.type, DCAT.Dataset) in graph


def test_export_incomplete_record_is_422(client: TestClient, org_id: str) -> None:
    ds = create(client, org_id, {"title": [{"text": "Draft"}]}, publish=False)
    res = client.get(f"{datasets_url(org_id)}/{ds}/export")
    assert res.status_code == 422
    assert res.json()["detail"].startswith("cannot export, missing: description,")


def test_export_complete_draft_is_allowed(client: TestClient, org_id: str) -> None:
    ds = create(client, org_id, golden_doc(FULL), publish=False)
    assert client.get(f"{datasets_url(org_id)}/{ds}/export").status_code == 200


def test_export_rejects_unknown_format(client: TestClient, org_id: str) -> None:
    ds = create(client, org_id, complete_public())
    res = client.get(f"{datasets_url(org_id)}/{ds}/export", params={"format": "csv"})
    assert res.status_code == 422


def test_auth_5_export_cross_tenant_404(
    client: TestClient, org_id: str, as_user: AsUser, outsider: Any
) -> None:
    ds = create(client, org_id, complete_public())
    # The caller's own other organisation cannot reach it by id...
    other = client.post("/api/v1/organisations", json={"name": "Other", "country": "NL"})
    other_id = other.json()["id"]
    assert client.get(f"{datasets_url(other_id)}/{ds}/export").status_code == 404
    assert client.post(f"{datasets_url(other_id)}/{ds}/validate").status_code == 404
    # ...and someone outside the organisation sees nothing at all
    stranger = as_user(outsider)
    assert stranger.get(f"{datasets_url(org_id)}/{ds}/export").status_code == 404
    assert stranger.post(f"{datasets_url(org_id)}/{ds}/validate").status_code == 404
    catalogue = f"/api/v1/organisations/{org_id}/catalogue/export"
    assert stranger.get(catalogue).status_code == 404
    assert client.get(f"{datasets_url(org_id)}/{uuid.uuid4()}/export").status_code == 404


def test_every_member_can_export_and_validate(
    client: TestClient, org_id: str, as_user: AsUser, standard: Any, add_member: Any
) -> None:
    ds = create(client, org_id, complete_public())
    add_member(org_id, standard, "standard")
    member = as_user(standard)
    assert member.get(f"{datasets_url(org_id)}/{ds}/export").status_code == 200
    assert member.post(f"{datasets_url(org_id)}/{ds}/validate").status_code == 200
    assert member.get(f"/api/v1/organisations/{org_id}/catalogue/export").status_code == 200


def test_validate_full_golden_example_conforms(client: TestClient, org_id: str) -> None:
    ds = create(client, org_id, golden_doc(FULL))
    res = client.post(f"{datasets_url(org_id)}/{ds}/validate")
    assert res.status_code == 200, res.text
    assert res.json() == {"conforms": True, "missing": [], "violations": []}


def test_validate_public_minimum_passes_shapes_but_lists_missing(
    client: TestClient, org_id: str
) -> None:
    ds = create(client, org_id, golden_doc("public_minimal"), publish=False)
    report = client.post(f"{datasets_url(org_id)}/{ds}/validate").json()
    assert report["violations"] == []
    assert report["conforms"] is False
    assert "keyword" in report["missing"]


def test_validate_reports_broken_rule_readably(client: TestClient, org_id: str) -> None:
    doc: dict[str, Any] = golden_doc("non_public_full") | {"variables": []}
    ds = create(client, org_id, doc, publish=False)
    report = client.post(f"{datasets_url(org_id)}/{ds}/validate").json()
    assert report["conforms"] is False
    assert report["missing"] == ["variables"]
    assert report["violations"] == [
        {
            "path": None,
            "field": "variables",
            "message": "Variables are required when the dataset has structured data. "
            "Add the variables, or answer no to structured data.",
            "severity": "violation",
        }
    ]


def test_validate_without_access_level_lists_missing_only(client: TestClient, org_id: str) -> None:
    ds = create(client, org_id, {"title": [{"text": "Draft"}]}, publish=False)
    report = client.post(f"{datasets_url(org_id)}/{ds}/validate").json()
    assert report["conforms"] is False
    assert "access_rights" in report["missing"]
    assert report["violations"] == []


def catalogue(client: TestClient, org_id: str, fmt: str) -> Graph:
    res = client.get(f"/api/v1/organisations/{org_id}/catalogue/export", params={"format": fmt})
    assert res.status_code == 200, res.text
    media_type, ext, _ = FORMATS[fmt]
    assert res.headers["content-type"].split(";")[0] == media_type
    assert res.headers["content-disposition"] == (
        f'attachment; filename="acme-health-catalogue.{ext}"'
    )
    return parse(res, fmt)


def catalogue_iri(org_id: str) -> URIRef:
    return URIRef(f"{get_settings().web_base_url}/orgs/{org_id}/catalogue")


@pytest.mark.parametrize("fmt", FORMATS)
def test_catalogue_empty(client: TestClient, org_id: str, fmt: str) -> None:
    # A draft is not part of the catalogue
    create(client, org_id, {"title": [{"text": "Draft"}]}, publish=False)
    graph = catalogue(client, org_id, fmt)
    cat = catalogue_iri(org_id)
    assert (cat, RDF.type, DCAT.Catalog) in graph
    assert (cat, DCT.title, Literal("Acme Health")) in graph
    assert (cat, DCATAP.applicableLegislation, EHDS_REGULATION) in graph
    assert list(graph.objects(cat, DCAT.dataset)) == []
    assert list(graph.subjects(RDF.type, DCAT.Dataset)) == []


@pytest.mark.parametrize("fmt", FORMATS)
def test_catalogue_one_dataset(client: TestClient, org_id: str, fmt: str) -> None:
    ds = create(client, org_id, complete_public() | {"quantum_label": QUANTUM})
    graph = catalogue(client, org_id, fmt)
    subject = dataset_iri(org_id, ds)
    assert list(graph.objects(catalogue_iri(org_id), DCAT.dataset)) == [subject]
    assert (URIRef("https://quantum.example.org/label-1"), None, None) in graph


@pytest.mark.parametrize("fmt", FORMATS)
def test_catalogue_two_datasets(client: TestClient, org_id: str, fmt: str) -> None:
    # Published as complete records; their extra fields are part of what is compared
    docs = {"public_minimal": complete_public(), FULL: golden_doc(FULL)}
    ids = {name: create(client, org_id, doc) for name, doc in docs.items()}
    graph = catalogue(client, org_id, fmt)
    cat = catalogue_iri(org_id)
    subjects = {dataset_iri(org_id, ds) for ds in ids.values()}
    assert set(graph.objects(cat, DCAT.dataset)) == subjects
    # Without the catalogue's own triples, the graph is the two datasets' graphs together
    publisher = graph.value(cat, DCT.publisher)
    datasets_only = Graph()
    for s, p, o in graph:
        if s not in (cat, publisher):
            datasets_only.add((s, p, o))
    expected = Graph()
    for name, ds in ids.items():
        meta = DatasetMetadata.model_validate(docs[name])
        expected += dataset_graph(CASES[name], meta)
        datasets_only = renamed(datasets_only, dataset_iri(org_id, ds), CASES[name])
    assert_same_graph(datasets_only, expected)
