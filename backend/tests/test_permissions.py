"""One table of every organisation route and the role it needs.

The table is checked against the OpenAPI schema, so a new organisation route without an entry
fails here until its role is decided. For each route: someone outside the organisation gets 404
(even when they own another organisation), a Standard member gets 403 on Owner-only routes and
is let through on the rest, and a refused call changes nothing.
"""

from typing import Any, Literal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from relay.app import create_app
from relay.domain.invitations import Invitation
from relay.domain.users import AppUser
from tests.conftest import AsUser

ORGS = "/api/v1/organisations"
PREFIX = ORGS + "/{org_id}"

Role = Literal["member", "owner"]

# (method, path, JSON body, lowest role allowed). {user} is a real Standard member,
# {dataset} a real dataset and {invitation} a pending invitation of the organisation.
ORG_ROUTES: list[tuple[str, str, Any, Role]] = [
    ("get", "", None, "member"),
    ("patch", "", {"name": "Taken"}, "owner"),
    ("get", "/members", None, "owner"),
    ("patch", "/members/{user}", {"role": "owner"}, "owner"),
    ("delete", "/members/{user}", None, "owner"),
    ("post", "/members/{user}/transfer-ownership", None, "owner"),
    ("get", "/invitations", None, "owner"),
    ("post", "/invitations", {"email": "new@example.org", "name": "New"}, "owner"),
    ("delete", "/invitations/{invitation}", None, "owner"),
    ("post", "/invitations/{invitation}/resend", None, "owner"),
    ("get", "/datasets", None, "member"),
    ("post", "/datasets", {}, "member"),
    ("get", "/datasets/{dataset}", None, "member"),
    ("put", "/datasets/{dataset}", {"version": 1, "metadata": {}}, "member"),
    ("post", "/datasets/{dataset}/publish", {"version": 1}, "member"),
    ("delete", "/datasets/{dataset}", None, "owner"),
    ("put", "/datasets/{dataset}/revalidation-reminder", {"reminder_date": "2999-01-01"}, "member"),
    ("post", "/datasets/{dataset}/revalidate", None, "member"),
    ("get", "/datasets/{dataset}/export", None, "member"),
    ("post", "/datasets/{dataset}/validate", None, "member"),
    ("get", "/catalogue/export", None, "member"),
]

OWNER_ROUTES = [r for r in ORG_ROUTES if r[3] == "owner"]
MEMBER_ROUTES = [r for r in ORG_ROUTES if r[3] == "member"]


def _ids(routes: list[tuple[str, str, Any, Role]]) -> list[str]:
    return [f"{m.upper()} {p or '/'}" for m, p, _, _ in routes]


def _real_routes() -> set[tuple[str, str]]:
    paths: dict[str, dict[str, Any]] = create_app().openapi()["paths"]
    return {
        (method, path.removeprefix(PREFIX).replace("{dataset_id}", "{dataset}"))
        for path, ops in paths.items()
        if path.startswith(PREFIX)
        for method in ops
    }


def _normalise(path: str) -> str:
    return path.replace("{user_id}", "{user}").replace("{invitation_id}", "{invitation}")


def test_org_route_table_matches_real_routes() -> None:
    real = {(m, _normalise(p)) for m, p in _real_routes()}
    listed = {(m, p) for m, p, _, _ in ORG_ROUTES}
    assert sorted(real - listed) == [], "organisation routes missing from the table"
    assert sorted(listed - real) == [], "table entries that are not routes"


class Arranged:
    """An organisation with a Standard member, a dataset and a pending invitation."""

    def __init__(
        self, owner: TestClient, org: str, standard: AppUser, db: sessionmaker[Session]
    ) -> None:
        self.owner, self.org, self.standard, self.db = owner, org, standard, db
        titled = {"metadata": {"title": [{"text": "Ours"}]}}
        res = owner.post(f"{ORGS}/{org}/datasets", json=titled)
        assert res.status_code == 201, res.text
        self.dataset: str = res.json()["id"]
        res = owner.post(
            f"{ORGS}/{org}/invitations", json={"email": "pending@example.org", "name": "Pen"}
        )
        assert res.status_code == 201, res.text
        self.invitation: str = res.json()["id"]

    def url(self, path: str) -> str:
        return f"{ORGS}/{self.org}" + path.format(
            user=self.standard.id, dataset=self.dataset, invitation=self.invitation
        )

    def snapshot(self) -> dict[str, Any]:
        org = self.owner.get(f"{ORGS}/{self.org}").json()
        dataset = self.owner.get(f"{ORGS}/{self.org}/datasets/{self.dataset}").json()
        members = self.owner.get(f"{ORGS}/{self.org}/members").json()
        with self.db() as session:
            invitation = session.get(Invitation, self.invitation)
            assert invitation is not None
            status = invitation.status
        return {
            "org": (org["name"], org["country"]),
            "members": sorted((m["user_id"], m["role"]) for m in members),
            "dataset": (dataset["version"], dataset["status"], dataset["metadata"]),
            "datasets": len(self.owner.get(f"{ORGS}/{self.org}/datasets").json()),
            "invitation": status,
        }


@pytest.fixture
def arranged(
    client: TestClient, org: str, standard: AppUser, db: sessionmaker[Session]
) -> Arranged:
    return Arranged(client, org, standard, db)


@pytest.mark.parametrize(("method", "path", "body", "role"), ORG_ROUTES, ids=_ids(ORG_ROUTES))
def test_auth_5_outsider_gets_404(
    arranged: Arranged,
    outsider: AppUser,
    as_user: AsUser,
    method: str,
    path: str,
    body: Any,
    role: Role,
) -> None:
    # The outsider owns an organisation of their own: a signed-in Owner, just not of this one
    them = as_user(outsider)
    res = them.post(ORGS, json={"name": "Elsewhere", "country": "NL"})
    assert res.status_code == 201, res.text
    before = arranged.snapshot()

    res = them.request(method, arranged.url(path), json=body)
    assert res.status_code == 404, res.text
    assert arranged.snapshot() == before


@pytest.mark.parametrize(("method", "path", "body", "role"), OWNER_ROUTES, ids=_ids(OWNER_ROUTES))
def test_auth_6_standard_gets_403_on_owner_routes(
    arranged: Arranged,
    standard: AppUser,
    as_user: AsUser,
    method: str,
    path: str,
    body: Any,
    role: Role,
) -> None:
    before = arranged.snapshot()

    res = as_user(standard).request(method, arranged.url(path), json=body)
    assert res.status_code == 403, res.text
    assert arranged.snapshot() == before


@pytest.mark.parametrize(("method", "path", "body", "role"), MEMBER_ROUTES, ids=_ids(MEMBER_ROUTES))
def test_auth_6_standard_reaches_member_routes(
    arranged: Arranged,
    standard: AppUser,
    as_user: AsUser,
    method: str,
    path: str,
    body: Any,
    role: Role,
) -> None:
    # Whatever the route answers (success, a validation error, 501 for a stub), the role and
    # the organisation did not stop it
    res = as_user(standard).request(method, arranged.url(path), json=body)
    assert res.status_code not in (403, 404), res.text
