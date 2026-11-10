import threading
import time
import uuid
from collections.abc import Callable
from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy import Engine, select, text
from sqlalchemy.orm import Session, sessionmaker

from relay.domain.datasets import Dataset
from relay.domain.memberships import Membership
from relay.domain.users import AppUser
from tests.conftest import AddMember, AsUser, MakeUser

ORGS = "/api/v1/organisations"


def members(org: str, *parts: object) -> str:
    return "/".join([f"{ORGS}/{org}/members", *(str(p) for p in parts)])


def roles(client: TestClient, org: str) -> list[tuple[str, str]]:
    res = client.get(members(org))
    assert res.status_code == 200, res.text
    return [(m["email"], m["role"]) for m in res.json()]


def test_mgt_2_owner_lists_members_with_role(
    client: TestClient,
    org: str,
    owner: AppUser,
    make_user: MakeUser,
    add_member: AddMember,
) -> None:
    # Owners first, then by name
    add_member(org, make_user("aaron@example.org", "Aaron Early"), "standard")
    add_member(org, make_user("zoe@example.org", "Zoe Owner"), "owner")
    res = client.get(members(org))
    assert res.status_code == 200
    listed = res.json()
    assert [(m["name"], m["role"]) for m in listed] == [
        ("Olive Owner", "owner"),
        ("Zoe Owner", "owner"),
        ("Aaron Early", "standard"),
        ("Sam Standard", "standard"),
    ]
    first = listed[0]
    assert first["user_id"] == str(owner.id)
    assert first["email"] == owner.email
    assert first["joined_at"]


def test_mgt_1_standard_cannot_list_members(org: str, standard: AppUser, as_user: AsUser) -> None:
    assert as_user(standard).get(members(org)).status_code == 403


def test_mgt_3_owner_changes_role(client: TestClient, org: str, standard: AppUser) -> None:
    res = client.patch(members(org, standard.id), json={"role": "owner"})
    assert res.status_code == 200, res.text
    assert (res.json()["user_id"], res.json()["role"]) == (str(standard.id), "owner")

    # Same role again is a no-op
    res = client.patch(members(org, standard.id), json={"role": "owner"})
    assert res.status_code == 200
    assert res.json()["role"] == "owner"

    res = client.patch(members(org, standard.id), json={"role": "standard"})
    assert res.json()["role"] == "standard"
    assert ("standard@example.org", "standard") in roles(client, org)


def test_mgt_3_new_owner_gains_owner_actions(
    client: TestClient, org: str, standard: AppUser, as_user: AsUser
) -> None:
    them = as_user(standard)
    assert them.get(members(org)).status_code == 403
    client.patch(members(org, standard.id), json={"role": "owner"})
    assert them.get(members(org)).status_code == 200
    assert them.get(f"{ORGS}/{org}").json()["role"] == "owner"


def test_mgt_3_standard_cannot_change_roles(
    org: str, owner: AppUser, standard: AppUser, as_user: AsUser
) -> None:
    them = as_user(standard)
    assert them.patch(members(org, standard.id), json={"role": "owner"}).status_code == 403
    assert them.patch(members(org, owner.id), json={"role": "standard"}).status_code == 403


def test_mgt_3_unknown_member_404(client: TestClient, org: str, outsider: AppUser) -> None:
    for user_id in (uuid.uuid4(), outsider.id):
        assert client.patch(members(org, user_id), json={"role": "owner"}).status_code == 404
        assert client.delete(members(org, user_id)).status_code == 404


def test_mgt_3_rejects_unknown_role(client: TestClient, org: str, standard: AppUser) -> None:
    res = client.patch(members(org, standard.id), json={"role": "admin"})
    assert res.status_code == 422


def test_mgt_4_standard_cannot_remove(
    org: str, owner: AppUser, standard: AppUser, as_user: AsUser
) -> None:
    them = as_user(standard)
    assert them.delete(members(org, owner.id)).status_code == 403
    assert them.delete(members(org, standard.id)).status_code == 403


def test_mgt_4_removed_member_loses_access_datasets_remain(
    client: TestClient,
    org: str,
    standard: AppUser,
    as_user: AsUser,
    db: sessionmaker[Session],
) -> None:
    them = as_user(standard)
    res = them.post(f"{ORGS}/{org}/datasets", json={"metadata": {"title": [{"text": "Theirs"}]}})
    assert res.status_code == 201
    dataset = res.json()["id"]

    res = client.delete(members(org, standard.id))
    assert res.status_code == 204
    assert res.content == b""

    assert them.get(f"{ORGS}/{org}").status_code == 404
    assert them.get(f"{ORGS}/{org}/datasets/{dataset}").status_code == 404
    assert them.get(ORGS).json() == []
    assert client.get(f"{ORGS}/{org}/datasets/{dataset}").json()["title"] == "Theirs"
    assert [email for email, _ in roles(client, org)] == ["owner@example.org"]
    with db() as session:
        assert session.get(Dataset, uuid.UUID(dataset)) is not None
        assert session.get(AppUser, standard.id) is not None


def test_mgt_5_cannot_demote_last_owner(client: TestClient, org: str, owner: AppUser) -> None:
    res = client.patch(members(org, owner.id), json={"role": "standard"})
    assert res.status_code == 409
    assert res.json()["detail"] == "cannot remove or demote the last owner"
    assert ("owner@example.org", "owner") in roles(client, org)


def test_mgt_5_cannot_remove_last_owner(client: TestClient, org: str, owner: AppUser) -> None:
    res = client.delete(members(org, owner.id))
    assert res.status_code == 409
    assert ("owner@example.org", "owner") in roles(client, org)


def test_mgt_5_owner_can_step_down_when_another_owner(
    client: TestClient, org: str, owner: AppUser, standard: AppUser, as_user: AsUser
) -> None:
    client.patch(members(org, standard.id), json={"role": "owner"})
    res = client.patch(members(org, owner.id), json={"role": "standard"})
    assert res.status_code == 200
    assert client.get(members(org)).status_code == 403

    # The new sole Owner then cannot leave, but can remove the former Owner
    them = as_user(standard)
    assert them.delete(members(org, standard.id)).status_code == 409
    assert them.delete(members(org, owner.id)).status_code == 204
    assert client.get(f"{ORGS}/{org}").status_code == 404


def test_mgt_5_owner_can_remove_self_when_another_owner(
    client: TestClient, org: str, owner: AppUser, standard: AppUser
) -> None:
    client.patch(members(org, standard.id), json={"role": "owner"})
    assert client.delete(members(org, owner.id)).status_code == 204
    assert client.get(f"{ORGS}/{org}").status_code == 404


def _wait_for_lock_waiters(engine: Engine, count: int) -> None:
    deadline = time.monotonic() + 10
    query = text(
        "SELECT count(*) FROM pg_stat_activity "
        "WHERE wait_event_type = 'Lock' AND datname = current_database()"
    )
    while time.monotonic() < deadline:
        with engine.connect() as conn:
            if conn.scalar(query) == count:
                return
        time.sleep(0.02)
    raise AssertionError(f"expected {count} requests waiting on the organisation lock")


def test_mgt_5_concurrent_demotions_keep_one_owner(
    client: TestClient,
    org: str,
    owner: AppUser,
    standard: AppUser,
    as_user: AsUser,
    engine: Engine,
    db: sessionmaker[Session],
) -> None:
    client.patch(members(org, standard.id), json={"role": "owner"})
    them = as_user(standard)
    results: dict[str, tuple[int, str]] = {}

    def demote(name: str, c: TestClient, target: AppUser) -> None:
        res = c.patch(members(org, target.id), json={"role": "standard"})
        results[name] = (res.status_code, res.text)

    threads = [
        threading.Thread(target=demote, args=("owner", client, standard)),
        threading.Thread(target=demote, args=("standard", them, owner)),
    ]
    # Hold the organisation lock so both requests pass their Owner check and then queue on it
    with engine.connect() as conn, conn.begin():
        conn.execute(text("SELECT id FROM organisation WHERE id = :id FOR UPDATE"), {"id": org})
        for t in threads:
            t.start()
        _wait_for_lock_waiters(engine, 2)
    for t in threads:
        t.join(timeout=10)

    assert sorted(code for code, _ in results.values()) == [200, 409], results
    with db() as session:
        owners = session.scalars(
            select(Membership.user_id).where(
                Membership.org_id == uuid.UUID(org), Membership.role == "owner"
            )
        ).all()
    assert len(owners) == 1


def transfer(org: str, user_id: object) -> str:
    return members(org, user_id, "transfer-ownership")


def owner_ids(db: sessionmaker[Session], org: str) -> list[uuid.UUID]:
    with db() as session:
        return list(
            session.scalars(
                select(Membership.user_id).where(
                    Membership.org_id == uuid.UUID(org), Membership.role == "owner"
                )
            ).all()
        )


def test_owner_transfers_ownership_to_standard(
    client: TestClient, org: str, owner: AppUser, standard: AppUser, as_user: AsUser
) -> None:
    res = client.post(transfer(org, standard.id))
    assert res.status_code == 200, res.text
    assert (res.json()["user_id"], res.json()["role"]) == (str(standard.id), "owner")

    assert client.get(f"{ORGS}/{org}").json()["role"] == "standard"
    assert client.get(members(org)).status_code == 403
    them = as_user(standard)
    assert sorted(roles(them, org)) == [
        ("owner@example.org", "standard"),
        ("standard@example.org", "owner"),
    ]


def test_new_owner_gains_owner_actions_old_owner_loses_them(
    client: TestClient, org: str, owner: AppUser, standard: AppUser, as_user: AsUser
) -> None:
    client.post(transfer(org, standard.id))
    them = as_user(standard)
    assert them.get(members(org)).status_code == 200
    assert client.patch(members(org, standard.id), json={"role": "standard"}).status_code == 403
    assert them.delete(members(org, owner.id)).status_code == 204


def test_other_owners_keep_their_role(
    client: TestClient,
    org: str,
    standard: AppUser,
    make_user: MakeUser,
    add_member: AddMember,
    as_user: AsUser,
) -> None:
    other = make_user("other@example.org", "Olga Other")
    add_member(org, other, "owner")
    assert client.post(transfer(org, standard.id)).status_code == 200
    assert ("other@example.org", "owner") in roles(as_user(other), org)


def test_standard_cannot_transfer(
    org: str, owner: AppUser, standard: AppUser, as_user: AsUser, db: sessionmaker[Session]
) -> None:
    them = as_user(standard)
    assert them.post(transfer(org, standard.id)).status_code == 403
    assert them.post(transfer(org, owner.id)).status_code == 403
    assert owner_ids(db, org) == [owner.id]


def test_transfer_to_non_member_404(
    client: TestClient, org: str, owner: AppUser, outsider: AppUser, db: sessionmaker[Session]
) -> None:
    pending = client.post(f"{ORGS}/{org}/invitations", json={"email": "invited@example.org"})
    assert pending.status_code == 201, pending.text
    for user_id in (uuid.uuid4(), outsider.id, pending.json().get("id", uuid.uuid4())):
        assert client.post(transfer(org, user_id)).status_code == 404
    assert owner_ids(db, org) == [owner.id]


def test_transfer_to_existing_owner_409(
    client: TestClient,
    org: str,
    owner: AppUser,
    standard: AppUser,
    db: sessionmaker[Session],
) -> None:
    client.patch(members(org, standard.id), json={"role": "owner"})
    res = client.post(transfer(org, standard.id))
    assert res.status_code == 409
    assert res.json()["detail"] == "member is already an owner"
    assert sorted(owner_ids(db, org)) == sorted([owner.id, standard.id])


def test_transfer_to_self_409(
    client: TestClient, org: str, owner: AppUser, db: sessionmaker[Session]
) -> None:
    assert client.post(transfer(org, owner.id)).status_code == 409
    assert owner_ids(db, org) == [owner.id]


def _run_while_org_locked(
    org: str, engine: Engine, calls: dict[str, Callable[[], Any]]
) -> dict[str, tuple[int, str]]:
    """Start every call, let them all queue on the organisation lock, then release it."""
    results: dict[str, tuple[int, str]] = {}

    def run(name: str, call: Callable[[], Any]) -> None:
        res = call()
        results[name] = (res.status_code, res.text)

    threads = [threading.Thread(target=run, args=(n, c)) for n, c in calls.items()]
    with engine.connect() as conn, conn.begin():
        conn.execute(text("SELECT id FROM organisation WHERE id = :id FOR UPDATE"), {"id": org})
        for t in threads:
            t.start()
        _wait_for_lock_waiters(engine, len(threads))
    for t in threads:
        t.join(timeout=10)
    return results


def test_concurrent_transfers_by_sole_owner_leave_one_owner(
    client: TestClient,
    org: str,
    standard: AppUser,
    make_user: MakeUser,
    add_member: AddMember,
    engine: Engine,
    db: sessionmaker[Session],
) -> None:
    other = make_user("other@example.org", "Olga Other")
    add_member(org, other, "standard")
    results = _run_while_org_locked(
        org,
        engine,
        {
            "standard": lambda: client.post(transfer(org, standard.id)),
            "other": lambda: client.post(transfer(org, other.id)),
        },
    )
    assert sorted(code for code, _ in results.values()) == [200, 403], results
    assert len(owner_ids(db, org)) == 1


def test_transfer_racing_target_removal_keeps_an_owner(
    client: TestClient,
    org: str,
    owner: AppUser,
    standard: AppUser,
    make_user: MakeUser,
    add_member: AddMember,
    as_user: AsUser,
    engine: Engine,
    db: sessionmaker[Session],
) -> None:
    other = make_user("other@example.org", "Olga Other")
    add_member(org, other, "owner")
    theirs = as_user(other)
    results = _run_while_org_locked(
        org,
        engine,
        {
            "transfer": lambda: client.post(transfer(org, standard.id)),
            "remove": lambda: theirs.delete(members(org, standard.id)),
        },
    )
    assert {code for code, _ in results.values()} <= {200, 204, 404}, results
    assert len(owner_ids(db, org)) >= 1
