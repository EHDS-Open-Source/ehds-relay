"""Tenant isolation for datasets.

The database tests connect as the app's own role (not superuser, owns the tables) and run raw
SQL, so they show row-level security holding without any of the app's own org checks.
"""

import uuid
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Connection, Engine, text
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.orm import Session, sessionmaker

from relay.db import set_tenant
from relay.domain.datasets import CURRENT_SCHEMA_VERSION, Dataset
from relay.domain.users import AppUser
from tests.conftest import AsUser

ORGS = "/api/v1/organisations"
TITLED = {"title": [{"text": "Draft"}]}


def _create_org(client: TestClient, name: str) -> uuid.UUID:
    res = client.post(ORGS, json={"name": name, "country": "NL"})
    assert res.status_code == 201, res.text
    return uuid.UUID(res.json()["id"])


def _insert_dataset(db: sessionmaker[Session], org_id: uuid.UUID) -> uuid.UUID:
    """Seed as the superuser, which is not subject to row-level security."""
    with db() as session:
        ds = Dataset(org_id=org_id, schema_version=CURRENT_SCHEMA_VERSION)
        session.add(ds)
        session.commit()
        return ds.id


def _as_tenant(conn: Connection, org_id: uuid.UUID) -> None:
    conn.execute(text("SELECT set_config('app.current_org_id', :id, true)"), {"id": str(org_id)})


def _visible(conn: Connection) -> set[uuid.UUID]:
    return set(conn.scalars(text("SELECT id FROM dataset")))


@pytest.fixture
def two_orgs(client: TestClient) -> tuple[uuid.UUID, uuid.UUID]:
    return _create_org(client, "Org A"), _create_org(client, "Org B")


@pytest.fixture
def app_conn(app_engine: Engine) -> Iterator[Connection]:
    with app_engine.connect() as conn, conn.begin():
        yield conn


def test_auth_5_rls_no_context_sees_nothing(
    two_orgs: tuple[uuid.UUID, uuid.UUID], db: sessionmaker[Session], app_conn: Connection
) -> None:
    for org_id in two_orgs:
        _insert_dataset(db, org_id)
    assert _visible(app_conn) == set()
    # An emptied setting (as left behind after a transaction-local set) also sees nothing
    app_conn.execute(text("SELECT set_config('app.current_org_id', '', true)"))
    assert _visible(app_conn) == set()
    assert app_conn.execute(text("UPDATE dataset SET version = version + 1")).rowcount == 0
    assert app_conn.execute(text("DELETE FROM dataset")).rowcount == 0


def test_auth_5_rls_other_org_context_sees_nothing(
    two_orgs: tuple[uuid.UUID, uuid.UUID], db: sessionmaker[Session], app_conn: Connection
) -> None:
    a, b = two_orgs
    a_ds = _insert_dataset(db, a)
    b_ds = _insert_dataset(db, b)

    _as_tenant(app_conn, a)
    assert _visible(app_conn) == {a_ds}
    _as_tenant(app_conn, b)
    assert _visible(app_conn) == {b_ds}
    _as_tenant(app_conn, uuid.uuid4())
    assert _visible(app_conn) == set()


def test_auth_5_rls_rejects_cross_org_insert_and_update(
    two_orgs: tuple[uuid.UUID, uuid.UUID], db: sessionmaker[Session], app_engine: Engine
) -> None:
    a, b = two_orgs
    a_ds = _insert_dataset(db, a)
    b_ds = _insert_dataset(db, b)
    insert = text("INSERT INTO dataset (org_id, schema_version) VALUES (:org, 'x')")

    with app_engine.connect() as conn, conn.begin():
        _as_tenant(conn, a)
        with pytest.raises(ProgrammingError, match="row-level security"):
            conn.execute(insert, {"org": b})
    with app_engine.connect() as conn, conn.begin():
        _as_tenant(conn, a)
        # Moving one of A's rows to B is refused
        with pytest.raises(ProgrammingError, match="row-level security"):
            conn.execute(
                text("UPDATE dataset SET org_id = :b WHERE id = :id"), {"b": b, "id": a_ds}
            )
    with app_engine.connect() as conn, conn.begin():
        _as_tenant(conn, a)
        # B's rows cannot be reached at all
        res = conn.execute(text("UPDATE dataset SET version = 99 WHERE id = :id"), {"id": b_ds})
        assert res.rowcount == 0
        assert conn.execute(text("DELETE FROM dataset WHERE id = :id"), {"id": b_ds}).rowcount == 0
        conn.execute(insert, {"org": a})

    with db() as session:
        b_row = session.get(Dataset, b_ds)
        assert b_row is not None
        assert b_row.version == 1
        assert {d.org_id for d in session.query(Dataset)} == {a, b}


def test_auth_5_rls_runtime_role_cannot_bypass(app_conn: Connection) -> None:
    role = app_conn.execute(
        text("SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user")
    ).one()
    assert (role.rolsuper, role.rolbypassrls) == (False, False)
    table = app_conn.execute(
        text(
            "SELECT relrowsecurity, relforcerowsecurity, pg_get_userbyid(relowner) = current_user"
            " AS owned FROM pg_class WHERE oid = 'dataset'::regclass"
        )
    ).one()
    # The app role owns the table, so only FORCE makes the policy apply to it
    assert (table.relrowsecurity, table.relforcerowsecurity, table.owned) == (True, True, True)


def test_auth_5_context_survives_commit(
    two_orgs: tuple[uuid.UUID, uuid.UUID], app_engine: Engine
) -> None:
    a, _ = two_orgs
    with Session(app_engine, expire_on_commit=False) as session:
        set_tenant(session, a)
        ds = Dataset(org_id=a, schema_version=CURRENT_SCHEMA_VERSION)
        session.add(ds)
        session.commit()
        # A new transaction: refresh only finds the row if the context was set again
        session.refresh(ds)
        ds.schema_version = "y"
        session.commit()
        session.refresh(ds)
        assert ds.version == 2
        session.commit()
        assert session.scalars(text("SELECT id FROM dataset")).all() == [ds.id]


def test_auth_5_context_survives_commit_over_http(
    client: TestClient, two_orgs: tuple[uuid.UUID, uuid.UUID]
) -> None:
    a, _ = two_orgs
    base = f"{ORGS}/{a}/datasets"
    res = client.post(base, json={"metadata": TITLED})
    assert res.status_code == 201, res.text
    ds = res.json()
    res = client.put(f"{base}/{ds['id']}", json={"metadata": TITLED, "version": 1})
    assert res.status_code == 200, res.text
    assert res.json()["version"] == 2
    res = client.delete(f"{base}/{ds['id']}")
    assert res.status_code == 204


DATASET_ROUTES: list[tuple[str, str, Any]] = [
    ("get", "", None),
    ("put", "", {"metadata": TITLED, "version": 1}),
    ("post", "/publish", {"version": 1}),
    ("delete", "", None),
    (
        "put",
        "/revalidation-reminder",
        {"reminder_date": (datetime.now(UTC).date() + timedelta(days=30)).isoformat()},
    ),
]


@pytest.mark.parametrize("member_of_b", [False, True], ids=["member of A", "member of A and B"])
@pytest.mark.parametrize(
    ("method", "suffix", "body"),
    DATASET_ROUTES,
    ids=[f"{m.upper()} /datasets/{{id}}{s}" for m, s, _ in DATASET_ROUTES],
)
def test_auth_5_cross_tenant_dataset_404(
    client: TestClient,
    outsider: AppUser,
    as_user: AsUser,
    db: sessionmaker[Session],
    member_of_b: bool,
    method: str,
    suffix: str,
    body: Any,
) -> None:
    a = _create_org(client, "Org A")
    # B is either another organisation of the same user, or one they have nothing to do with
    b = _create_org(client if member_of_b else as_user(outsider), "Org B")
    b_ds = _insert_dataset(db, b)

    res = client.request(method, f"{ORGS}/{a}/datasets/{b_ds}{suffix}", json=body)
    assert res.status_code == 404, res.text
    assert client.get(f"{ORGS}/{a}/datasets").json() == []
    with db() as session:
        row = session.get(Dataset, b_ds)
        assert row is not None
        assert (row.org_id, row.version, row.status) == (b, 1, "draft")
        assert row.reminder_date is None
