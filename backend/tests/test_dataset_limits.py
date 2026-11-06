"""Length limits on dataset text and keywords: strict on write, lenient on stored data."""

import copy
import uuid
from typing import Any

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import Engine, update
from sqlalchemy.orm import Session, sessionmaker

from relay.app import create_app
from relay.domain.datasets import Dataset
from relay.dtos.dataset_metadata import (
    DEFINITION_MAX_LENGTH,
    DESCRIPTION_MAX_LENGTH,
    KEYWORD_MAX_LENGTH,
    KEYWORDS_MAX_ITEMS,
    PROVENANCE_MAX_LENGTH,
    TITLE_MAX_LENGTH,
    DatasetMetadata,
)
from tests.test_datasets import complete_metadata, url
from tests.test_export import datasets_url

VARIABLE = {"name": "age", "data_type": "integer", "definition": "Age in years"}


def with_value(path: list[str | int], value: Any) -> dict[str, Any]:
    meta = complete_metadata()
    meta["variables"] = [dict(VARIABLE)]
    node: Any = meta
    for key in path[:-1]:
        node = node[key]
    node[path[-1]] = value
    return meta


FIELDS: list[tuple[list[str | int], int]] = [
    (["title", 0, "text"], TITLE_MAX_LENGTH),
    (["description", 0, "text"], DESCRIPTION_MAX_LENGTH),
    (["provenance"], PROVENANCE_MAX_LENGTH),
    (["variables", 0, "definition"], DEFINITION_MAX_LENGTH),
    (["keyword", 0], KEYWORD_MAX_LENGTH),
]
IDS = ["title", "description", "provenance", "definition", "keyword"]


@pytest.fixture
def org_id(client: TestClient) -> str:
    return client.post("/api/v1/organisations", json={"name": "Acme", "country": "NL"}).json()["id"]


@pytest.mark.parametrize(("path", "limit"), FIELDS, ids=IDS)
def test_text_at_limit_is_accepted_and_over_is_422(
    client: TestClient, org_id: str, path: list[str | int], limit: int
) -> None:
    ok = client.post(url(org_id), json={"metadata": with_value(path, "x" * limit)})
    assert ok.status_code == 201, ok.text
    ds = ok.json()
    put = client.put(
        url(org_id, ds["id"]),
        json={"metadata": with_value(path, "x" * limit), "version": ds["version"]},
    )
    assert put.status_code == 200, put.text

    over = with_value(path, "x" * (limit + 1))
    for res in (
        client.post(url(org_id), json={"metadata": over}),
        client.put(url(org_id, ds["id"]), json={"metadata": over, "version": ds["version"] + 1}),
    ):
        assert res.status_code == 422
        (err,) = res.json()["detail"]
        assert err["type"] == "string_too_long"
        assert err["ctx"]["max_length"] == limit
        assert err["loc"] == ["body", "metadata", *path]


def test_too_many_keywords(client: TestClient, org_id: str) -> None:
    ok = client.post(
        url(org_id),
        json={"metadata": with_value(["keyword"], [f"k{i}" for i in range(KEYWORDS_MAX_ITEMS)])},
    )
    assert ok.status_code == 201, ok.text
    res = client.post(
        url(org_id),
        json={
            "metadata": with_value(["keyword"], [f"k{i}" for i in range(KEYWORDS_MAX_ITEMS + 1)])
        },
    )
    assert res.status_code == 422
    (err,) = res.json()["detail"]
    assert err["type"] == "too_long"
    assert err["loc"] == ["body", "metadata", "keyword"]
    assert err["ctx"]["max_length"] == KEYWORDS_MAX_ITEMS


def test_limits_are_per_language_entry_and_count_characters(
    client: TestClient, org_id: str
) -> None:
    meta = complete_metadata()
    meta["title"] = [
        {"lang": "en", "text": "a" * TITLE_MAX_LENGTH},
        {"lang": "fr", "text": "é" * TITLE_MAX_LENGTH},
        {"lang": "ja", "text": "日" * TITLE_MAX_LENGTH},
    ]
    assert client.post(url(org_id), json={"metadata": meta}).status_code == 201


def test_model_rejects_over_limit_but_from_stored_accepts() -> None:
    over = {"title": [{"text": "x" * (TITLE_MAX_LENGTH + 1)}]}
    with pytest.raises(ValidationError):
        DatasetMetadata.model_validate(over)
    assert DatasetMetadata.from_stored(over).display_title() == "x" * (TITLE_MAX_LENGTH + 1)


def over_length_metadata() -> dict[str, Any]:
    meta = complete_metadata()
    meta["variables"] = [dict(VARIABLE, definition="d" * (DEFINITION_MAX_LENGTH + 1))]
    meta["title"] = [{"lang": "en", "text": "t" * (TITLE_MAX_LENGTH + 1)}]
    meta["description"] = [{"lang": "en", "text": "d" * (DESCRIPTION_MAX_LENGTH + 1)}]
    meta["provenance"] = "p" * (PROVENANCE_MAX_LENGTH + 1)
    meta["keyword"] = [f"k{i}" for i in range(KEYWORDS_MAX_ITEMS + 1)]
    meta["keyword"][0] = "k" * (KEYWORD_MAX_LENGTH + 1)
    meta["structured_data"] = True
    return meta


def plant(db: sessionmaker[Session], ds_id: str, meta: dict[str, Any]) -> None:
    with db() as session:
        session.execute(
            update(Dataset).where(Dataset.id == uuid.UUID(ds_id)).values(metadata_doc=meta)
        )
        session.commit()


def test_stored_over_length_dataset_still_works(
    client: TestClient, org_id: str, db: sessionmaker[Session], engine: Engine
) -> None:
    created = client.post(url(org_id), json={"metadata": with_value(["structured_data"], True)})
    assert created.status_code == 201, created.text
    ds = created.json()
    assert ds["status"] == "draft"
    legacy = over_length_metadata()
    plant(db, ds["id"], legacy)

    one = client.get(url(org_id, ds["id"]))
    assert one.status_code == 200
    assert one.json()["metadata"]["title"][0]["text"] == legacy["title"][0]["text"]
    assert client.get(url(org_id)).status_code == 200
    for fmt in ("ttl", "rdfxml", "jsonld"):
        res = client.get(f"{datasets_url(org_id)}/{ds['id']}/export", params={"format": fmt})
        assert res.status_code == 200, (fmt, res.text)
    assert client.post(f"{datasets_url(org_id)}/{ds['id']}/validate").status_code == 200
    published = client.post(url(org_id, ds["id"], "publish"), json={"version": ds["version"]})
    assert published.status_code == 200, published.text
    assert client.get(f"/api/v1/organisations/{org_id}/catalogue/export").status_code == 200
    reminder = client.put(
        url(org_id, ds["id"], "revalidation-reminder"), json={"reminder_date": None}
    )
    assert reminder.status_code == 200

    current = client.get(url(org_id, ds["id"])).json()
    # Saving unchanged is refused field by field
    res = client.put(
        url(org_id, ds["id"]), json={"metadata": current["metadata"], "version": current["version"]}
    )
    assert res.status_code == 422
    locs = {tuple(e["loc"][2:]) for e in res.json()["detail"]}
    assert locs == {
        ("title", 0, "text"),
        ("description", 0, "text"),
        ("provenance",),
        ("variables", 0, "definition"),
        ("keyword", 0),
    }

    # Shortened, it saves
    fixed = copy.deepcopy(current["metadata"])
    fixed["title"][0]["text"] = "Short"
    fixed["description"][0]["text"] = "Short"
    fixed["provenance"] = "Short"
    fixed["variables"][0]["definition"] = "Short"
    fixed["keyword"] = ["a", "b"]
    res = client.put(url(org_id, ds["id"]), json={"metadata": fixed, "version": current["version"]})
    assert res.status_code == 200, res.text


def test_openapi_publishes_limits() -> None:
    schemas = create_app().openapi()["components"]["schemas"]
    assert schemas["TitleText"]["properties"]["text"]["maxLength"] == TITLE_MAX_LENGTH
    assert schemas["DescriptionText"]["properties"]["text"]["maxLength"] == DESCRIPTION_MAX_LENGTH
    assert schemas["Variable"]["properties"]["definition"]["maxLength"] == DEFINITION_MAX_LENGTH
    meta = schemas["DatasetMetadata"]["properties"]
    assert meta["keyword"]["maxItems"] == KEYWORDS_MAX_ITEMS
    assert meta["keyword"]["items"]["maxLength"] == KEYWORD_MAX_LENGTH
    assert PROVENANCE_MAX_LENGTH == 2000
    assert (
        any(o.get("maxLength") == PROVENANCE_MAX_LENGTH for o in meta["provenance"]["anyOf"])
        or meta["provenance"].get("maxLength") == PROVENANCE_MAX_LENGTH
    )
