"""Dataset metadata model rules that need no database."""

import json
from pathlib import Path
from typing import Any

import pytest
from pydantic import ValidationError

from relay.dtos.dataset_metadata import DatasetMetadata

GOLDEN = Path(__file__).parent / "golden"


def full() -> dict[str, Any]:
    return json.loads((GOLDEN / "non_public_full.json").read_text())


def test_complete_dataset_has_nothing_missing() -> None:
    assert DatasetMetadata.model_validate(full()).missing_for_publish() == []


def test_display_title_prefers_english() -> None:
    meta = DatasetMetadata.model_validate(
        {"title": [{"lang": "fr", "text": "Titre"}, {"lang": "en", "text": "Title"}]}
    )
    assert meta.display_title() == "Title"
    only_fr = DatasetMetadata.model_validate({"title": [{"lang": "fr", "text": "Titre"}]})
    assert only_fr.display_title() == "Titre"
    assert DatasetMetadata().display_title() is None


def test_variables_required_only_when_structured() -> None:
    doc: dict[str, Any] = full() | {"variables": []}
    assert DatasetMetadata.model_validate(doc).missing_for_publish() == ["variables"]
    doc["structured_data"] = False
    assert DatasetMetadata.model_validate(doc).missing_for_publish() == []


def test_hdab_not_required_for_public_data() -> None:
    doc = full()
    del doc["health_data_access_body"]
    assert DatasetMetadata.model_validate(doc).missing_for_publish() == ["health_data_access_body"]
    doc["access_rights"] = "public"
    assert DatasetMetadata.model_validate(doc).missing_for_publish() == []


def test_unique_individuals_required_only_with_personal_data() -> None:
    doc = full()
    del doc["number_of_unique_individuals"]
    missing = DatasetMetadata.model_validate(doc).missing_for_publish()
    assert missing == ["number_of_unique_individuals"]
    doc["has_personal_data"] = False
    assert DatasetMetadata.model_validate(doc).missing_for_publish() == []


def test_organisation_needs_contact_point_to_publish() -> None:
    doc = full()
    del doc["publisher"]["contact_point"]
    assert DatasetMetadata.model_validate(doc).missing_for_publish() == ["publisher.contact_point"]


@pytest.mark.parametrize(
    "patch",
    [
        {"creator": [{"name": "x"}]},  # not on the EU list
        {"access_rights": "http://publications.europa.eu/resource/authority/access-right/PUBLIC"},
        {"title": [{"lang": "english", "text": "t"}]},
        {"health_category": ["http://example.org/no-label"]},
        {"number_of_records": -1},
        {"temporal_coverage": {"start": "2024-01-01", "end": "2020-01-01"}},
        {"quantum_label": "this is not turtle ."},
    ],
)
def test_rejects_invalid(patch: dict[str, Any]) -> None:
    with pytest.raises(ValidationError):
        DatasetMetadata.model_validate(patch)


def test_quantum_label_accepts_turtle() -> None:
    label = '<https://example.org/label> <http://www.w3.org/2000/01/rdf-schema#label> "Q" .'
    assert DatasetMetadata.model_validate({"quantum_label": label}).quantum_label == label
