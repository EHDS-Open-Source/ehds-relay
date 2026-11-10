import uuid
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, update
from sqlalchemy.orm import Session, sessionmaker

from relay.domain.memberships import Membership
from relay.domain.organisations import Organisation
from relay.domain.users import AppUser
from tests.conftest import AddMember, AsUser

ORGS = "/api/v1/organisations"


def create(client: TestClient, name: str, country: str = "NL") -> dict[str, Any]:
    res = client.post(ORGS, json={"name": name, "country": country})
    assert res.status_code == 201, res.text
    return res.json()


def test_create_list_get(client: TestClient) -> None:
    created = create(client, "Acme")
    assert created["name"] == "Acme"
    assert created["country"] == "NL"
    assert created["status"] == "active"

    res = client.get(ORGS)
    assert res.status_code == 200
    assert [o["id"] for o in res.json()] == [created["id"]]

    res = client.get(f"{ORGS}/{created['id']}")
    assert res.status_code == 200
    assert res.json() == created


def test_org_5_creator_becomes_owner(
    client: TestClient, owner: AppUser, db: sessionmaker[Session]
) -> None:
    created = create(client, "Acme")
    assert created["role"] == "owner"
    with db() as session:
        rows = session.scalars(select(Membership)).all()
        assert [(str(m.org_id), m.user_id, m.role) for m in rows] == [
            (created["id"], owner.id, "owner")
        ]


def test_org_4_country_required(client: TestClient) -> None:
    assert client.post(ORGS, json={"name": "Acme"}).status_code == 422
    assert client.post(ORGS, json={"name": "Acme", "country": None}).status_code == 422


def test_get_unknown_returns_404(client: TestClient) -> None:
    res = client.get(f"{ORGS}/{uuid.uuid4()}")
    assert res.status_code == 404


def test_create_rejects_invalid_payload(client: TestClient) -> None:
    assert client.post(ORGS, json={"name": "", "country": "NL"}).status_code == 422
    assert client.post(ORGS, json={"name": "Acme", "country": "nl"}).status_code == 422


def test_create_rejects_unknown_fields(client: TestClient) -> None:
    res = client.post(ORGS, json={"name": "Acme", "country": "NL", "status": "deleted"})
    assert res.status_code == 422


def test_auth_3_list_only_my_orgs_with_role(
    client: TestClient,
    standard: AppUser,
    outsider: AppUser,
    as_user: AsUser,
    add_member: AddMember,
) -> None:
    # `standard` owns B, is Standard in A, and is not in C
    a = create(client, "alpha")
    add_member(a["id"], standard, "standard")
    them = as_user(standard)
    b = create(them, "Beta")
    create(as_user(outsider), "Charlie")

    res = them.get(ORGS)
    assert res.status_code == 200
    assert [(o["name"], o["role"]) for o in res.json()] == [
        ("alpha", "standard"),
        ("Beta", "owner"),
    ]
    assert {o["id"] for o in res.json()} == {a["id"], b["id"]}


def test_list_hides_deleted_orgs(client: TestClient, db: sessionmaker[Session]) -> None:
    gone = create(client, "Gone")
    with db() as session:
        session.execute(
            update(Organisation)
            .where(Organisation.id == uuid.UUID(gone["id"]))
            .values(status="deleted")
        )
        session.commit()
    assert client.get(ORGS).json() == []
    assert client.get(f"{ORGS}/{gone['id']}").status_code == 404


def test_auth_6_role_differs_per_org(
    client: TestClient, org: str, standard: AppUser, as_user: AsUser
) -> None:
    them = as_user(standard)
    own = create(them, "Theirs")
    assert them.get(f"{ORGS}/{org}").json()["role"] == "standard"
    assert them.get(f"{ORGS}/{own['id']}").json()["role"] == "owner"
    assert them.get(f"{ORGS}/{org}/members").status_code == 403
    assert them.get(f"{ORGS}/{own['id']}/members").status_code == 200


def test_mgt_6_owner_edits_org(client: TestClient, org: str) -> None:
    res = client.patch(f"{ORGS}/{org}", json={"name": "Acme Health"})
    assert res.status_code == 200, res.text
    body = res.json()
    assert (body["name"], body["country"], body["role"]) == ("Acme Health", "NL", "owner")

    res = client.patch(f"{ORGS}/{org}", json={"country": "BE"})
    assert (res.json()["name"], res.json()["country"]) == ("Acme Health", "BE")
    assert client.get(f"{ORGS}/{org}").json()["country"] == "BE"


def test_mgt_6_standard_cannot_edit_org(org: str, standard: AppUser, as_user: AsUser) -> None:
    res = as_user(standard).patch(f"{ORGS}/{org}", json={"name": "Mine now"})
    assert res.status_code == 403


@pytest.mark.parametrize("body", [{"name": None}, {"country": None}, {"country": "nl"}, {}])
def test_mgt_6_rejects_null_and_invalid(client: TestClient, org: str, body: Any) -> None:
    res = client.patch(f"{ORGS}/{org}", json=body)
    if body:
        assert res.status_code == 422
    else:
        # An empty update changes nothing
        assert res.status_code == 200
        assert res.json()["name"] == "Acme"


# Every organisation-scoped route, as (method, path under the organisation, JSON body).
# {user} is a real member, {dataset} a real dataset of the organisation.
SCOPED: list[tuple[str, str, Any]] = [
    ("get", "", None),
    ("patch", "", {"name": "Taken"}),
    ("get", "/members", None),
    ("patch", "/members/{user}", {"role": "standard"}),
    ("delete", "/members/{user}", None),
    ("post", "/members/{user}/transfer-ownership", None),
    ("get", "/datasets", None),
    ("post", "/datasets", {}),
    ("get", "/datasets/{dataset}", None),
    ("put", "/datasets/{dataset}", {"version": 1, "metadata": {}}),
    ("post", "/datasets/{dataset}/publish", {"version": 1}),
    ("delete", "/datasets/{dataset}", None),
    ("get", "/datasets/{dataset}/export", None),
    ("post", "/datasets/{dataset}/validate", None),
    ("get", "/catalogue/export", None),
]


@pytest.mark.parametrize(
    ("method", "path", "body"), SCOPED, ids=[f"{m.upper()} {p or '/'}" for m, p, _ in SCOPED]
)
def test_auth_5_non_member_gets_404(
    client: TestClient,
    org: str,
    standard: AppUser,
    outsider: AppUser,
    as_user: AsUser,
    method: str,
    path: str,
    body: Any,
) -> None:
    titled = {"metadata": {"title": [{"text": "Ours"}]}}
    dataset = client.post(f"{ORGS}/{org}/datasets", json=titled).json()["id"]
    url = f"{ORGS}/{org}" + path.format(user=standard.id, dataset=dataset)
    # The outsider owns an organisation of their own, so they are a signed-in Owner elsewhere
    them = as_user(outsider)
    create(them, "Elsewhere")

    res = them.request(method, url, json=body)
    assert res.status_code == 404, res.text
    # Nothing changed: the Owner still sees the organisation, member and dataset as before
    assert client.get(f"{ORGS}/{org}").json()["name"] == "Acme"
    assert len(client.get(f"{ORGS}/{org}/members").json()) == 2
    assert client.get(f"{ORGS}/{org}/datasets/{dataset}").json()["version"] == 1
