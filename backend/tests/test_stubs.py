"""Routes whose shape is defined but whose logic has not landed yet.

These need no database: stubs take no session, and the sign-in check is replaced by a
dummy user (an Owner of every organisation) so protected stubs still reach their handler.
When a route gets real logic, move its case out of STUBS into that area's tests.
"""

import uuid
from typing import Any

import pytest
from fastapi.testclient import TestClient

from relay.app import create_app
from relay.auth.authz import require_member
from relay.auth.csrf import CSRF_HEADER, CSRF_HEADER_VALUE
from relay.auth.deps import current_user
from relay.domain.memberships import MemberRole, Membership
from relay.domain.users import AppUser

ORG = f"/api/v1/organisations/{uuid.uuid4()}"
DATASET = f"{ORG}/datasets/{uuid.uuid4()}"
USER_ID = uuid.uuid4()

# (method, path template as in the OpenAPI spec, concrete URL, JSON body)
STUBS: list[tuple[str, str, str, Any]] = [
    ("patch", "/api/v1/me", "/api/v1/me", {"name": "Ada"}),
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
    app = create_app()
    user = AppUser(id=uuid.uuid4(), email="ada@example.org", name="Ada")
    app.dependency_overrides[current_user] = lambda: user
    app.dependency_overrides[require_member] = lambda: Membership(
        org_id=uuid.uuid4(), user_id=user.id, role=MemberRole.OWNER.value
    )
    return TestClient(app, headers={CSRF_HEADER: CSRF_HEADER_VALUE}, follow_redirects=False)


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
