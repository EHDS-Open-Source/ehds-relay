import uuid
from typing import Any

import pytest
from fastapi.testclient import TestClient

LEGISLATION = {
    "label": "EHDS Regulation",
    "uri": "http://data.europa.eu/eli/reg/2025/327/oj",
}
CONTACT = {"name": "Data desk", "email": "data@example.org"}


def term(label: str) -> dict[str, str]:
    return {"label": label, "uri": f"http://example.org/{label.lower().replace(' ', '-')}"}


def complete_metadata() -> dict[str, Any]:
    org = {"name": "Registry", "contact_point": CONTACT}
    return {
        "title": [{"lang": "en", "text": "Diabetes registry"}],
        "description": [{"text": "Pseudonymised diabetes cohort"}],
        "distributions": [
            {"access_url": "https://example.org/access", "applicable_legislation": [LEGISLATION]}
        ],
        "structured_data": False,
        "provenance": "Collected from hospital records",
        "keyword": ["diabetes"],
        "health_theme": [term("Diabetes")],
        "health_category": [term("Registry")],
        "has_personal_data": False,
        "conforms_to": [term("OMOP")],
        "access_rights": "non_public",
        "applicable_legislation": [LEGISLATION],
        "health_data_access_body": {"name": "HDAB NL", "contact_point": CONTACT},
        "type": [term("Registry type")],
        "language": [term("English")],
        "health_data_holder": org,
        "publisher": org,
        "contact_points": [CONTACT],
        "identifier": ["reg-001"],
        "generated_by": [term("Routine records")],
    }


@pytest.fixture
def org_id(client: TestClient) -> str:
    return client.post("/api/v1/organisations", json={"name": "Acme"}).json()["id"]


def url(org_id: str, *parts: str) -> str:
    return "/".join([f"/api/v1/organisations/{org_id}/datasets", *parts])


def test_create_get_list(client: TestClient, org_id: str) -> None:
    res = client.post(url(org_id), json={"metadata": complete_metadata()})
    assert res.status_code == 201
    ds = res.json()
    assert ds["status"] == "draft"
    assert ds["version"] == 1
    assert ds["title"] == "Diabetes registry"
    assert ds["schema_version"].startswith("healthdcat-ap-r8")
    assert ds["metadata"]["identifier"] == ["reg-001"]

    assert client.get(url(org_id, ds["id"])).json() == ds
    assert [d["id"] for d in client.get(url(org_id)).json()] == [ds["id"]]
    assert client.get(url(org_id), params={"dataset_status": "published"}).json() == []


def test_draft_may_be_empty(client: TestClient, org_id: str) -> None:
    res = client.post(url(org_id), json={})
    assert res.status_code == 201
    assert res.json()["title"] is None


def test_unknown_org_and_dataset_404(client: TestClient, org_id: str) -> None:
    assert client.get(url(str(uuid.uuid4()))).status_code == 404
    assert client.get(url(org_id, str(uuid.uuid4()))).status_code == 404


def test_dataset_not_visible_via_other_org(client: TestClient, org_id: str) -> None:
    ds = client.post(url(org_id), json={}).json()
    other = client.post("/api/v1/organisations", json={"name": "Other"}).json()["id"]
    assert client.get(url(other, ds["id"])).status_code == 404


def test_rejects_unknown_and_invalid_metadata(client: TestClient, org_id: str) -> None:
    assert client.post(url(org_id), json={"metadata": {"nope": 1}}).status_code == 422
    bad_contact = {"contact_points": [{"name": "x"}]}
    assert client.post(url(org_id), json={"metadata": bad_contact}).status_code == 422
    backwards = {"temporal_coverage": {"start": "2024-01-01", "end": "2020-01-01"}}
    assert client.post(url(org_id), json={"metadata": backwards}).status_code == 422


def test_repeatable_groups_roundtrip(client: TestClient, org_id: str) -> None:
    meta = complete_metadata() | {
        "structured_data": True,
        "contact_points": [CONTACT, {"name": "Second", "email": "b@example.org"}],
        "distributions": [
            {
                "access_url": "https://example.org/d",
                "applicable_legislation": [LEGISLATION],
                "format": term("CSV"),
            }
        ],
        "variables": [{"name": "age", "data_type": "integer", "definition": "Age in years"}],
    }
    res = client.post(url(org_id), json={"metadata": meta})
    assert res.status_code == 201
    doc = res.json()["metadata"]
    assert len(doc["contact_points"]) == 2
    assert doc["distributions"][0]["format"]["label"] == "CSV"
    assert doc["variables"][0]["name"] == "age"


def test_update_and_stale_version_409(client: TestClient, org_id: str) -> None:
    ds = client.post(url(org_id), json={"metadata": complete_metadata()}).json()
    meta = complete_metadata() | {"title": [{"lang": "en", "text": "Renamed"}]}

    res = client.put(url(org_id, ds["id"]), json={"metadata": meta, "version": 1})
    assert res.status_code == 200
    assert res.json()["version"] == 2
    assert res.json()["title"] == "Renamed"

    stale = client.put(url(org_id, ds["id"]), json={"metadata": meta, "version": 1})
    assert stale.status_code == 409
    assert client.get(url(org_id, ds["id"])).json()["version"] == 2


def test_publish(client: TestClient, org_id: str) -> None:
    ds = client.post(url(org_id), json={"metadata": complete_metadata()}).json()
    res = client.post(url(org_id, ds["id"], "publish"), json={"version": 1})
    assert res.status_code == 200
    assert res.json()["status"] == "published"
    assert res.json()["version"] == 2

    # Already published, and stale
    assert client.post(url(org_id, ds["id"], "publish"), json={"version": 2}).status_code == 409
    assert client.post(url(org_id, ds["id"], "publish"), json={"version": 1}).status_code == 409


def test_publish_requires_mandatory_fields(client: TestClient, org_id: str) -> None:
    ds = client.post(url(org_id), json={"metadata": {"title": [{"text": "t"}]}}).json()
    res = client.post(url(org_id, ds["id"], "publish"), json={"version": 1})
    assert res.status_code == 422
    assert "description" in res.json()["detail"]


def test_publish_requires_variables_when_structured(client: TestClient, org_id: str) -> None:
    meta = complete_metadata() | {"structured_data": True}
    ds = client.post(url(org_id), json={"metadata": meta}).json()
    res = client.post(url(org_id, ds["id"], "publish"), json={"version": 1})
    assert res.status_code == 422
    assert "variables" in res.json()["detail"]


def test_published_update_must_stay_publishable(client: TestClient, org_id: str) -> None:
    ds = client.post(url(org_id), json={"metadata": complete_metadata()}).json()
    pub = client.post(url(org_id, ds["id"], "publish"), json={"version": 1}).json()
    body = {"metadata": {"title": [{"text": "x"}]}, "version": pub["version"]}
    res = client.put(url(org_id, ds["id"]), json=body)
    assert res.status_code == 422


@pytest.mark.parametrize(
    ("email", "ok"),
    [
        ("first.last+tag@example.org", True),
        ("user_name-1@sub.example.co.uk", True),
        ("!#$%&'*+/=?^_`{|}~-@example.org", True),
        ('"john doe"@example.org', True),
        ('"a@b"@example.org', True),
        ("user@localhost", True),
        ("user@[192.168.0.1]", True),
        ("üser@exämple.org", True),
        ("пользователь@пример.рф", True),
        ("用户@例子.广告", True),
        ("अजय@उदाहरण.भारत", True),
        ("مستخدم@مثال.السعودية", True),
        ("ユーザー@例え.jp", True),
        ("δοκιμή@παράδειγμα.ευ", True),
        ("no-at-sign", False),
        ("two@@example.org", False),
        ("user@exa mple.org", False),
        (" leading@example.org", False),
        ("user@", False),
        ("@example.org", False),
    ],
)
def test_email_characters(client: TestClient, org_id: str, email: str, ok: bool) -> None:
    meta = {"contact_points": [{"name": "Desk", "email": email}]}
    res = client.post(url(org_id), json={"metadata": meta})
    assert res.status_code == (201 if ok else 422), email


def test_missing_for_publish_reported(client: TestClient, org_id: str) -> None:
    ds = client.post(
        url(org_id), json={"metadata": {"title": [{"text": "t"}], "structured_data": True}}
    ).json()
    assert ds["missing_for_publish"] == [
        "description",
        "distributions",
        "variables",
        "provenance",
        "keyword",
        "health_theme",
        "health_category",
        "has_personal_data",
        "conforms_to",
        "access_rights",
        "applicable_legislation",
        "health_data_access_body",
        "type",
        "language",
        "health_data_holder",
        "publisher",
        "contact_points",
        "identifier",
        "generated_by",
    ]
    assert client.get(url(org_id)).json()[0]["missing_for_publish"] == ds["missing_for_publish"]

    full = client.post(url(org_id), json={"metadata": complete_metadata()}).json()
    assert full["missing_for_publish"] == []
