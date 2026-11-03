from fastapi.testclient import TestClient


def test_healthz(client: TestClient) -> None:
    res = client.get("/healthz")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_readyz(client: TestClient) -> None:
    res = client.get("/readyz")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}
