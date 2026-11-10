import re
import threading
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, update
from sqlalchemy.orm import Session, sessionmaker

from relay.auth.sessions import hash_token
from relay.domain.email_outbox import EmailOutbox
from relay.domain.invitations import Invitation
from relay.domain.memberships import Membership
from relay.domain.organisations import Organisation
from relay.domain.users import AppUser
from relay.settings import get_settings
from tests.conftest import AddMember, AsUser, MakeUser

INVITEE = "invitee@example.org"
LINK = re.compile(r"/invitations/([A-Za-z0-9_-]+)")


def _invitations(org_id: str) -> str:
    return f"/api/v1/organisations/{org_id}/invitations"


def _invite(client: TestClient, org_id: str, **body: Any) -> dict[str, Any]:
    res = client.post(_invitations(org_id), json={"email": INVITEE, "name": "Ines Invitee", **body})
    assert res.status_code == 201, res.text
    data: dict[str, Any] = res.json()
    return data


def _outbox(db: sessionmaker[Session]) -> list[EmailOutbox]:
    with db() as session:
        return list(session.scalars(select(EmailOutbox).order_by(EmailOutbox.created_at)))


def _latest_token(db: sessionmaker[Session]) -> str:
    body = _outbox(db)[-1].text_body
    assert body is not None
    match = LINK.search(body)
    assert match is not None, body
    return match.group(1)


def _expire(db: sessionmaker[Session], invitation_id: str) -> None:
    with db() as session:
        session.execute(
            update(Invitation)
            .where(Invitation.id == uuid.UUID(invitation_id))
            .values(expires_at=datetime.now(UTC) - timedelta(seconds=1))
        )
        session.commit()


@pytest.fixture
def invitee(make_user: MakeUser) -> AppUser:
    return make_user(INVITEE, "Ivy Invitee")


@pytest.fixture
def invitee_client(as_user: AsUser, invitee: AppUser) -> TestClient:
    return as_user(invitee)


# Creating


def test_inv_1_owner_invites_by_email(client: TestClient, org: str, owner: AppUser) -> None:
    before = datetime.now(UTC)
    data = _invite(client, org, email="Invitee@Example.ORG")
    assert data["email"] == INVITEE
    assert data["status"] == "pending"
    assert data["role"] == "standard"
    assert data["org_id"] == org
    assert data["invited_by"] == str(owner.id)
    expires = datetime.fromisoformat(data["expires_at"])
    assert before + timedelta(days=30) <= expires <= datetime.now(UTC) + timedelta(days=30)
    assert datetime.fromisoformat(data["last_sent_at"]) >= before


def test_inv_1_invalid_email_422(client: TestClient, org: str) -> None:
    res = client.post(_invitations(org), json={"email": "not-an-email"})
    assert res.status_code == 422


def test_inv_2_role_defaults_to_standard_and_owner_allowed(client: TestClient, org: str) -> None:
    assert _invite(client, org)["role"] == "standard"
    data = _invite(client, org, email="second@example.org", role="owner")
    assert data["role"] == "owner"


def test_inv_8_standard_cannot_invite(
    as_user: AsUser, client: TestClient, standard: AppUser, org: str
) -> None:
    inv = _invite(client, org)
    std = as_user(standard)
    base = _invitations(org)
    assert std.post(base, json={"email": "x@example.org", "name": "X"}).status_code == 403
    assert std.get(base).status_code == 403
    assert std.delete(f"{base}/{inv['id']}").status_code == 403
    assert std.post(f"{base}/{inv['id']}/resend").status_code == 403


@pytest.mark.parametrize(
    ("method", "suffix", "body"),
    [
        ("get", "", None),
        ("post", "", {"email": "x@example.org"}),
        ("delete", "/{id}", None),
        ("post", "/{id}/resend", None),
    ],
)
def test_auth_5_non_member_gets_404(
    as_user: AsUser,
    client: TestClient,
    outsider: AppUser,
    org: str,
    method: str,
    suffix: str,
    body: Any,
) -> None:
    inv = _invite(client, org)
    url = _invitations(org) + suffix.format(id=inv["id"])
    res = as_user(outsider).request(method, url, json=body)
    assert res.status_code == 404


def test_inv_1_duplicate_pending_409(client: TestClient, org: str) -> None:
    _invite(client, org)
    res = client.post(_invitations(org), json={"email": INVITEE.upper(), "name": "Ines"})
    assert res.status_code == 409
    assert "resend" in res.json()["detail"]


def test_inv_1_existing_member_409(client: TestClient, org: str, standard: AppUser) -> None:
    res = client.post(_invitations(org), json={"email": standard.email.upper(), "name": "Sam"})
    assert res.status_code == 409
    assert res.json()["detail"] == "already a member of this organisation"


def test_inv_1_reinvite_after_expiry(
    client: TestClient, org: str, db: sessionmaker[Session]
) -> None:
    first = _invite(client, org)
    _expire(db, first["id"])
    second = _invite(client, org)
    assert second["id"] != first["id"]
    statuses = {i["id"]: i["status"] for i in client.get(_invitations(org)).json()}
    assert statuses == {first["id"]: "expired", second["id"]: "pending"}


def test_inv_3_writes_outbox_row_in_same_transaction(
    client: TestClient, org: str, db: sessionmaker[Session]
) -> None:
    data = _invite(client, org)
    (row,) = _outbox(db)
    assert row.to_address == INVITEE
    assert row.sent_at is None
    assert "Acme" in row.subject
    assert "Olive Owner" in row.subject
    for body in (row.text_body, row.html_body):
        assert body is not None
        assert "Acme" in body
        assert "Olive Owner" in body
        assert f"{get_settings().web_base_url}/invitations/" in body
    token = _latest_token(db)
    with db() as session:
        invitation = session.get(Invitation, uuid.UUID(data["id"]))
        assert invitation is not None
        assert invitation.token_hash == hash_token(token)


def test_inv_3_failed_create_writes_no_email(
    client: TestClient, org: str, db: sessionmaker[Session]
) -> None:
    _invite(client, org)
    res = client.post(_invitations(org), json={"email": INVITEE, "name": "Ines"})
    assert res.status_code == 409
    assert len(_outbox(db)) == 1


def test_inv_3_expires_after_30_days(
    client: TestClient,
    anon_client: TestClient,
    invitee_client: TestClient,
    org: str,
    db: sessionmaker[Session],
) -> None:
    data = _invite(client, org)
    token = _latest_token(db)
    _expire(db, data["id"])
    assert anon_client.get(f"/api/v1/invitations/{token}").json()["status"] == "expired"
    assert invitee_client.post(f"/api/v1/invitations/{token}/accept").status_code == 410
    expired = client.get(_invitations(org), params={"status": "expired"}).json()
    assert [i["id"] for i in expired] == [data["id"]]


# Preview


def test_preview_is_public(
    client: TestClient, anon_client: TestClient, org: str, db: sessionmaker[Session]
) -> None:
    data = _invite(client, org)
    res = anon_client.get(f"/api/v1/invitations/{_latest_token(db)}")
    assert res.status_code == 200, res.text
    assert res.json() == {
        "organisation_name": "Acme",
        "invited_by_name": "Olive Owner",
        "email": INVITEE,
        "role": "standard",
        "status": "pending",
        "expires_at": data["expires_at"],
    }


def test_preview_unknown_token_404(anon_client: TestClient) -> None:
    assert anon_client.get("/api/v1/invitations/nope").status_code == 404


# Accepting


def test_inv_4_accept_adds_standard_member(
    client: TestClient,
    anon_client: TestClient,
    invitee_client: TestClient,
    invitee: AppUser,
    org: str,
    db: sessionmaker[Session],
) -> None:
    _invite(client, org)
    token = _latest_token(db)
    res = invitee_client.post(f"/api/v1/invitations/{token}/accept")
    assert res.status_code == 200, res.text
    assert res.json()["id"] == org
    assert res.json()["role"] == "standard"
    assert [(o["id"], o["role"]) for o in invitee_client.get("/api/v1/organisations").json()] == [
        (org, "standard")
    ]
    members = client.get(f"/api/v1/organisations/{org}/members").json()
    assert {"user_id": str(invitee.id), "role": "standard"}.items() <= next(
        m for m in members if m["user_id"] == str(invitee.id)
    ).items()
    assert anon_client.get(f"/api/v1/invitations/{token}").json()["status"] == "accepted"
    with db() as session:
        invitation = session.scalars(select(Invitation)).one()
        assert invitation.accepted_by == invitee.id
        assert invitation.accepted_at is not None


def test_inv_4_accept_as_owner_role(
    client: TestClient, invitee_client: TestClient, org: str, db: sessionmaker[Session]
) -> None:
    _invite(client, org, role="owner")
    res = invitee_client.post(f"/api/v1/invitations/{_latest_token(db)}/accept")
    assert res.json()["role"] == "owner"


def test_inv_5_accept_keeps_other_orgs_and_roles(
    as_user: AsUser,
    make_user: MakeUser,
    client: TestClient,
    invitee_client: TestClient,
    org: str,
    db: sessionmaker[Session],
) -> None:
    # The invitee already owns another organisation
    other = invitee_client.post("/api/v1/organisations", json={"name": "Beta", "country": "BE"})
    assert other.status_code == 201
    _invite(client, org)
    assert invitee_client.post(f"/api/v1/invitations/{_latest_token(db)}/accept").status_code == 200
    orgs = invitee_client.get("/api/v1/organisations").json()
    assert [(o["name"], o["role"]) for o in orgs] == [("Acme", "standard"), ("Beta", "owner")]


def test_accept_twice_is_idempotent(
    client: TestClient, invitee_client: TestClient, org: str, db: sessionmaker[Session]
) -> None:
    _invite(client, org)
    url = f"/api/v1/invitations/{_latest_token(db)}/accept"
    first = invitee_client.post(url)
    second = invitee_client.post(url)
    assert first.status_code == second.status_code == 200
    assert first.json() == second.json()


def test_accepted_link_is_gone_for_others(
    client: TestClient,
    invitee_client: TestClient,
    as_user: AsUser,
    make_user: MakeUser,
    org: str,
    db: sessionmaker[Session],
) -> None:
    _invite(client, org)
    url = f"/api/v1/invitations/{_latest_token(db)}/accept"
    assert invitee_client.post(url).status_code == 200
    other = as_user(make_user("other@example.org", "Other"))
    assert other.post(url).status_code == 410


def test_accept_needs_session(
    client: TestClient, anon_client: TestClient, org: str, db: sessionmaker[Session]
) -> None:
    _invite(client, org)
    assert anon_client.post(f"/api/v1/invitations/{_latest_token(db)}/accept").status_code == 401


def test_accept_unknown_token_404(invitee_client: TestClient) -> None:
    assert invitee_client.post("/api/v1/invitations/nope/accept").status_code == 404


def test_accept_existing_member_keeps_role(
    client: TestClient,
    as_user: AsUser,
    invitee: AppUser,
    add_member: AddMember,
    org: str,
    db: sessionmaker[Session],
) -> None:
    _invite(client, org, role="owner")
    token = _latest_token(db)
    # Joined some other way while the invitation was pending
    add_member(org, invitee, "standard")
    res = as_user(invitee).post(f"/api/v1/invitations/{token}/accept")
    assert res.status_code == 200
    assert res.json()["role"] == "standard"


def test_accept_email_mismatch_403(
    client: TestClient,
    as_user: AsUser,
    outsider: AppUser,
    org: str,
    db: sessionmaker[Session],
) -> None:
    _invite(client, org)
    res = as_user(outsider).post(f"/api/v1/invitations/{_latest_token(db)}/accept")
    assert res.status_code == 403
    with db() as session:
        assert session.get(Membership, (uuid.UUID(org), outsider.id)) is None


def test_accept_email_match_ignores_case(
    client: TestClient, as_user: AsUser, make_user: MakeUser, org: str, db: sessionmaker[Session]
) -> None:
    _invite(client, org)
    user = make_user("Invitee@Example.ORG", "Ivy")
    assert as_user(user).post(f"/api/v1/invitations/{_latest_token(db)}/accept").status_code == 200


def test_accept_deleted_org_404(
    client: TestClient, invitee_client: TestClient, org: str, db: sessionmaker[Session]
) -> None:
    _invite(client, org)
    token = _latest_token(db)
    with db() as session:
        session.execute(
            update(Organisation).where(Organisation.id == uuid.UUID(org)).values(status="deleted")
        )
        session.commit()
    assert invitee_client.post(f"/api/v1/invitations/{token}/accept").status_code == 404
    assert invitee_client.get(f"/api/v1/invitations/{token}").status_code == 404


def test_concurrent_accepts_single_membership(
    as_user: AsUser, client: TestClient, invitee: AppUser, org: str, db: sessionmaker[Session]
) -> None:
    _invite(client, org)
    url = f"/api/v1/invitations/{_latest_token(db)}/accept"
    clients = [as_user(invitee), as_user(invitee)]
    barrier = threading.Barrier(2)
    codes: list[int] = []

    def accept(c: TestClient) -> None:
        barrier.wait()
        codes.append(c.post(url).status_code)

    threads = [threading.Thread(target=accept, args=(c,)) for c in clients]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert codes == [200, 200]
    with db() as session:
        rows = session.scalars(select(Membership).where(Membership.user_id == invitee.id)).all()
        assert len(rows) == 1


# Listing, cancelling, resending


def test_inv_7_list_filters_by_status(
    client: TestClient, invitee_client: TestClient, org: str, db: sessionmaker[Session]
) -> None:
    accepted = _invite(client, org)
    assert invitee_client.post(f"/api/v1/invitations/{_latest_token(db)}/accept").status_code == 200
    cancelled = _invite(client, org, email="c@example.org")
    assert client.delete(f"{_invitations(org)}/{cancelled['id']}").status_code == 204
    pending = _invite(client, org, email="p@example.org")

    everything = client.get(_invitations(org)).json()
    assert [i["id"] for i in everything] == [pending["id"], cancelled["id"], accepted["id"]]
    for state, expected in (
        ("pending", pending),
        ("cancelled", cancelled),
        ("accepted", accepted),
    ):
        listed = client.get(_invitations(org), params={"status": state}).json()
        assert [i["id"] for i in listed] == [expected["id"]], state
        assert listed[0]["status"] == state
    assert client.get(_invitations(org), params={"status": "expired"}).json() == []
    assert client.get(_invitations(org), params={"status": "bogus"}).status_code == 422


def test_inv_7_list_is_per_organisation(
    client: TestClient, org: str, db: sessionmaker[Session]
) -> None:
    _invite(client, org)
    other = client.post("/api/v1/organisations", json={"name": "Other", "country": "NL"}).json()
    assert client.get(_invitations(other["id"])).json() == []


def test_inv_7_cancel_kills_link(
    client: TestClient,
    anon_client: TestClient,
    invitee_client: TestClient,
    org: str,
    db: sessionmaker[Session],
) -> None:
    inv = _invite(client, org)
    token = _latest_token(db)
    assert client.delete(f"{_invitations(org)}/{inv['id']}").status_code == 204
    assert invitee_client.post(f"/api/v1/invitations/{token}/accept").status_code == 410
    assert anon_client.get(f"/api/v1/invitations/{token}").json()["status"] == "cancelled"
    # A cancelled invitation does not block a new one
    _invite(client, org)


def test_cancel_non_pending_409(client: TestClient, org: str) -> None:
    inv = _invite(client, org)
    url = f"{_invitations(org)}/{inv['id']}"
    assert client.delete(url).status_code == 204
    assert client.delete(url).status_code == 409
    assert client.post(f"{url}/resend").status_code == 409


def test_cancel_other_org_invitation_404(client: TestClient, org: str) -> None:
    inv = _invite(client, org)
    other = client.post("/api/v1/organisations", json={"name": "Other", "country": "NL"}).json()
    assert client.delete(f"{_invitations(other['id'])}/{inv['id']}").status_code == 404
    assert client.post(f"{_invitations(other['id'])}/{inv['id']}/resend").status_code == 404
    assert client.delete(f"{_invitations(org)}/{uuid.uuid4()}").status_code == 404


def test_inv_7_resend_rotates_token_and_requeues_email(
    client: TestClient,
    anon_client: TestClient,
    invitee_client: TestClient,
    org: str,
    db: sessionmaker[Session],
) -> None:
    inv = _invite(client, org)
    old_token = _latest_token(db)
    with db() as session:
        # Pretend it was sent a while ago, so the new send date is visibly later
        session.execute(
            update(Invitation).values(
                last_sent_at=datetime.now(UTC) - timedelta(days=3),
                expires_at=datetime.now(UTC) + timedelta(days=27),
            )
        )
        session.commit()
    before = client.get(_invitations(org)).json()[0]

    res = client.post(f"{_invitations(org)}/{inv['id']}/resend")
    assert res.status_code == 200, res.text
    after = res.json()
    assert after["id"] == inv["id"]
    assert after["status"] == "pending"
    assert after["last_sent_at"] > before["last_sent_at"]
    assert after["expires_at"] > before["expires_at"]
    assert after["created_at"] == before["created_at"]
    assert client.get(_invitations(org)).json()[0]["last_sent_at"] == after["last_sent_at"]

    assert len(_outbox(db)) == 2
    new_token = _latest_token(db)
    assert new_token != old_token
    assert anon_client.get(f"/api/v1/invitations/{old_token}").status_code == 404
    assert invitee_client.post(f"/api/v1/invitations/{old_token}/accept").status_code == 404
    assert invitee_client.post(f"/api/v1/invitations/{new_token}/accept").status_code == 200


def test_resend_expired_reopens(
    client: TestClient, invitee_client: TestClient, org: str, db: sessionmaker[Session]
) -> None:
    inv = _invite(client, org)
    _expire(db, inv["id"])
    res = client.post(f"{_invitations(org)}/{inv['id']}/resend")
    assert res.status_code == 200
    assert res.json()["status"] == "pending"
    assert invitee_client.post(f"/api/v1/invitations/{_latest_token(db)}/accept").status_code == 200


def test_resend_expired_when_newer_pending_exists_409(
    client: TestClient, org: str, db: sessionmaker[Session]
) -> None:
    first = _invite(client, org)
    _expire(db, first["id"])
    _invite(client, org)
    res = client.post(f"{_invitations(org)}/{first['id']}/resend")
    assert res.status_code == 409
    assert len(_outbox(db)) == 2


def test_resend_accepted_409(
    client: TestClient, invitee_client: TestClient, org: str, db: sessionmaker[Session]
) -> None:
    inv = _invite(client, org)
    invitee_client.post(f"/api/v1/invitations/{_latest_token(db)}/accept")
    assert client.post(f"{_invitations(org)}/{inv['id']}/resend").status_code == 409


def test_openapi_documents_error_responses(app: Any) -> None:
    paths = app.openapi()["paths"]
    org_base = "/api/v1/organisations/{org_id}/invitations"
    assert "409" in paths[org_base]["post"]["responses"]
    assert "409" in paths[org_base + "/{invitation_id}"]["delete"]["responses"]
    assert "409" in paths[org_base + "/{invitation_id}/resend"]["post"]["responses"]
    accept = paths["/api/v1/invitations/{token}/accept"]["post"]["responses"]
    assert {"403", "404", "410"} <= set(accept)
    props = app.openapi()["components"]["schemas"]["InvitationDTO"]["properties"]
    assert "last_sent_at" in props


# --- name and message ---------------------------------------------------------------------


def _create(client: TestClient, org: str, **body: Any) -> Any:
    return client.post(_invitations(org), json={"email": INVITEE, **body})


def test_name_and_message_are_trimmed_and_echoed(client: TestClient, org: str) -> None:
    data = _invite(client, org, name="  Ada   Lovelace ", message="  Welcome\r\naboard!\n ")
    assert data["name"] == "Ada Lovelace"
    assert data["message"] == "Welcome\naboard!"
    listed = client.get(_invitations(org)).json()[0]
    assert (listed["name"], listed["message"]) == ("Ada Lovelace", "Welcome\naboard!")


@pytest.mark.parametrize("message", [None, "", "  \n "])
def test_blank_message_becomes_null(client: TestClient, org: str, message: str | None) -> None:
    body: dict[str, Any] = {"name": "Ada"}
    if message is not None:
        body["message"] = message
    res = _create(client, org, **body)
    assert res.status_code == 201, res.text
    assert res.json()["message"] is None


@pytest.mark.parametrize("name", ["", "   ", None])
def test_name_required(client: TestClient, org: str, name: str | None) -> None:
    body = {} if name is None else {"name": name}
    res = _create(client, org, **body)
    assert res.status_code == 422
    assert res.json()["detail"][0]["loc"] == ["body", "name"]


@pytest.mark.parametrize(("field", "limit"), [("name", 200), ("message", 1000)])
def test_length_limits(client: TestClient, org: str, field: str, limit: int) -> None:
    base = {"name": "Ada"}
    ok = _create(client, org, **{**base, field: "é" * limit})
    assert ok.status_code == 201, ok.text
    client.delete(f"{_invitations(org)}/{ok.json()['id']}")
    res = _create(client, org, **{**base, field: "é" * (limit + 1)})
    assert res.status_code == 422
    err = res.json()["detail"][0]
    assert err["loc"] == ["body", field]
    assert err["type"] == "string_too_long"
    assert err["ctx"]["max_length"] == limit


def test_email_has_name_and_escaped_message(client: TestClient, org: str, db: Any) -> None:
    _invite(client, org, name="Ada <b>&", message='Hi "you"\n<script>x</script> & co')
    row = _outbox(db)[-1]
    assert "Hi Ada <b>&," in (row.text_body or "")
    assert "<script>x</script> & co" in (row.text_body or "")
    html = row.html_body or ""
    assert "Hi Ada &lt;b&gt;&amp;," in html
    assert "&lt;script&gt;x&lt;/script&gt; &amp; co" in html
    assert "<script>" not in html
    assert "&quot;you&quot;<br>\n" in html
    assert "Ada" not in row.subject
    assert "Hi" not in row.subject
    assert "\n" not in row.subject


def test_resend_keeps_name_and_message(client: TestClient, org: str, db: Any) -> None:
    inv = _invite(client, org, name="Ada", message="Welcome")
    res = client.post(f"{_invitations(org)}/{inv['id']}/resend")
    assert res.status_code == 200, res.text
    assert (res.json()["name"], res.json()["message"]) == ("Ada", "Welcome")
    last = _outbox(db)[-1]
    assert "Hi Ada," in (last.text_body or "")
    assert "Welcome" in (last.text_body or "")


def test_invitation_without_name_lists_resends_and_accepts(
    client: TestClient, invitee_client: TestClient, org: str, db: Any
) -> None:
    inv = _invite(client, org)
    with db() as session:
        session.execute(update(Invitation).values(name=None, message=None))
        session.commit()
    listed = client.get(_invitations(org)).json()[0]
    assert listed["name"] is None
    assert listed["message"] is None
    assert client.post(f"{_invitations(org)}/{inv['id']}/resend").status_code == 200
    assert (_outbox(db)[-1].text_body or "").startswith("Hello,")
    assert invitee_client.post(f"/api/v1/invitations/{_latest_token(db)}/accept").status_code == 200


def test_openapi_publishes_limits(client: TestClient) -> None:
    schema = client.get("/openapi.json").json()["components"]["schemas"]["InvitationCreateDTO"]
    assert schema["properties"]["name"]["maxLength"] == 200
    assert schema["properties"]["message"]["anyOf"][0]["maxLength"] == 1000
    assert "name" in schema["required"]


def test_migration_cycle_and_single_head(app_database_url: str) -> None:
    from alembic import command
    from alembic.config import Config
    from alembic.script import ScriptDirectory
    from sqlalchemy import create_engine, inspect

    cfg = Config("alembic.ini")
    cfg.attributes["database_url"] = app_database_url
    assert len(ScriptDirectory.from_config(cfg).get_heads()) == 1

    def columns() -> set[str]:
        engine = create_engine(app_database_url)
        try:
            return {c["name"] for c in inspect(engine).get_columns("invitation")}
        finally:
            engine.dispose()

    try:
        command.downgrade(cfg, "0010")
        assert not {"name", "message"} & columns()
        command.upgrade(cfg, "head")
        assert {"name", "message"} <= columns()
    finally:
        command.upgrade(cfg, "head")
