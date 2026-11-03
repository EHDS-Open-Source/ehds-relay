import uuid

from fastapi.testclient import TestClient


def test_create_list_get(client: TestClient) -> None:
    res = client.post("/api/v1/organisations", json={"name": "Acme", "country": "NL"})
    assert res.status_code == 201
    created = res.json()
    assert created["name"] == "Acme"
    assert created["country"] == "NL"
    assert created["status"] == "active"

    res = client.get("/api/v1/organisations")
    assert res.status_code == 200
    assert [o["id"] for o in res.json()] == [created["id"]]

    res = client.get(f"/api/v1/organisations/{created['id']}")
    assert res.status_code == 200
    assert res.json() == created


def test_get_unknown_returns_404(client: TestClient) -> None:
    res = client.get(f"/api/v1/organisations/{uuid.uuid4()}")
    assert res.status_code == 404


def test_create_rejects_invalid_payload(client: TestClient) -> None:
    assert client.post("/api/v1/organisations", json={"name": ""}).status_code == 422
    res = client.post("/api/v1/organisations", json={"name": "Acme", "country": "nl"})
    assert res.status_code == 422


def test_create_rejects_unknown_fields(client: TestClient) -> None:
    res = client.post("/api/v1/organisations", json={"name": "Acme", "status": "deleted"})
    assert res.status_code == 422
