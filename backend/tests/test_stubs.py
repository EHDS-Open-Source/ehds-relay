"""Routes whose shape is defined but whose logic has not landed yet.

These need no database: stubs take no session, so the app is used without overrides.
When a route gets real logic, move its case out of STUBS into that area's tests.
"""

import uuid
from typing import Any

import pytest
from fastapi.testclient import TestClient

from relay.app import create_app

ORG = f"/api/v1/organisations/{uuid.uuid4()}"
DATASET = f"{ORG}/datasets/{uuid.uuid4()}"
USER_ID = uuid.uuid4()
INVITATION_ID = uuid.uuid4()

# (method, path template as in the OpenAPI spec, concrete URL, JSON body)
STUBS: list[tuple[str, str, str, Any]] = [
    ("get", "/api/v1/me", "/api/v1/me", None),
    ("patch", "/api/v1/me", "/api/v1/me", {"name": "Ada"}),
    ("get", "/api/v1/auth/login", "/api/v1/auth/login", None),
    ("get", "/api/v1/auth/callback", "/api/v1/auth/callback?code=c&state=s", None),
    ("post", "/api/v1/auth/logout", "/api/v1/auth/logout", None),
    ("patch", "/api/v1/organisations/{org_id}", ORG, {"name": "Acme"}),
    ("get", "/api/v1/organisations/{org_id}/members", f"{ORG}/members", None),
    (
        "patch",
        "/api/v1/organisations/{org_id}/members/{user_id}",
        f"{ORG}/members/{USER_ID}",
        {"role": "owner"},
    ),
    (
        "delete",
        "/api/v1/organisations/{org_id}/members/{user_id}",
        f"{ORG}/members/{USER_ID}",
        None,
    ),
    (
        "get",
        "/api/v1/organisations/{org_id}/invitations",
        f"{ORG}/invitations?status=pending",
        None,
    ),
    (
        "post",
        "/api/v1/organisations/{org_id}/invitations",
        f"{ORG}/invitations",
        {"email": "ada@example.org", "role": "standard"},
    ),
    (
        "delete",
        "/api/v1/organisations/{org_id}/invitations/{invitation_id}",
        f"{ORG}/invitations/{INVITATION_ID}",
        None,
    ),
    (
        "post",
        "/api/v1/organisations/{org_id}/invitations/{invitation_id}/resend",
        f"{ORG}/invitations/{INVITATION_ID}/resend",
        None,
    ),
    ("get", "/api/v1/invitations/{token}", "/api/v1/invitations/abc", None),
    ("post", "/api/v1/invitations/{token}/accept", "/api/v1/invitations/abc/accept", None),
    ("delete", "/api/v1/organisations/{org_id}/datasets/{dataset_id}", DATASET, None),
    (
        "put",
        "/api/v1/organisations/{org_id}/datasets/{dataset_id}/revalidation-reminder",
        f"{DATASET}/revalidation-reminder",
        {"due_date": "2027-11-03"},
    ),
    (
        "post",
        "/api/v1/organisations/{org_id}/datasets/{dataset_id}/revalidate",
        f"{DATASET}/revalidate",
        None,
    ),
    (
        "get",
        "/api/v1/organisations/{org_id}/datasets/{dataset_id}/export",
        f"{DATASET}/export?format=jsonld",
        None,
    ),
    (
        "post",
        "/api/v1/organisations/{org_id}/datasets/{dataset_id}/validate",
        f"{DATASET}/validate",
        None,
    ),
    (
        "get",
        "/api/v1/organisations/{org_id}/catalogue/export",
        f"{ORG}/catalogue/export?format=rdfxml",
        None,
    ),
    ("get", "/api/v1/capabilities", "/api/v1/capabilities", None),
]


@pytest.fixture(scope="module")
def stub_client() -> TestClient:
    return TestClient(create_app(), follow_redirects=False)


@pytest.mark.parametrize(
    ("method", "url", "body"),
    [(m, url, body) for m, _, url, body in STUBS],
    ids=[f"{m.upper()} {path}" for m, path, _, _ in STUBS],
)
def test_stub_returns_501(stub_client: TestClient, method: str, url: str, body: Any) -> None:
    res = stub_client.request(method, url, json=body)
    assert res.status_code == 501, res.text
    assert res.json() == {"detail": "Not implemented yet"}


def test_openapi_lists_every_stub() -> None:
    paths = create_app().openapi()["paths"]
    missing = [(m, p) for m, p, _, _ in STUBS if m not in paths.get(p, {})]
    assert missing == []


def test_openapi_documents_dataset_search_params() -> None:
    op = create_app().openapi()["paths"]["/api/v1/organisations/{org_id}/datasets"]["get"]
    names = {p["name"] for p in op["parameters"]}
    assert {"dataset_status", "q", "access_rights"} <= names
