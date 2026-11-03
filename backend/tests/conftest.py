import uuid
from collections.abc import Callable, Iterator

import pytest
from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine, make_url, text
from sqlalchemy.orm import Session, sessionmaker
from testcontainers.community.postgres import PostgresContainer

from relay.app import create_app
from relay.auth.csrf import CSRF_HEADER, CSRF_HEADER_VALUE
from relay.auth.sessions import create_session
from relay.db import Base, get_session
from relay.domain.memberships import Membership
from relay.domain.users import AppUser
from relay.settings import get_settings

TEST_ISSUER = "https://idp.test/realms/relay"

MakeUser = Callable[..., AppUser]
SignIn = Callable[[TestClient, AppUser], str]


# The app's database role, as in development: it logs in, owns the tables (it runs the
# migrations), and is neither superuser nor BYPASSRLS, so row-level security applies to it.
APP_ROLE = "relay"
APP_PASSWORD = "relay"


@pytest.fixture(scope="session")
def _postgres() -> Iterator[tuple[str, str]]:
    """(superuser URL, app role URL) for a throwaway database migrated to head."""
    with PostgresContainer("postgres:17", driver="psycopg2") as pg:
        url = pg.get_connection_url()
        admin = create_engine(url)
        with admin.begin() as conn:
            conn.execute(text(f"CREATE ROLE {APP_ROLE} LOGIN PASSWORD '{APP_PASSWORD}'"))
            conn.execute(text(f"GRANT CREATE ON SCHEMA public TO {APP_ROLE}"))
        admin.dispose()
        app_url = (
            make_url(url)
            .set(username=APP_ROLE, password=APP_PASSWORD)
            .render_as_string(hide_password=False)
        )
        cfg = Config("alembic.ini")
        cfg.attributes["database_url"] = app_url
        command.upgrade(cfg, "head")
        yield url, app_url


@pytest.fixture(scope="session")
def database_url(_postgres: tuple[str, str]) -> str:
    """Superuser URL, for arranging and inspecting rows across organisations."""
    return _postgres[0]


@pytest.fixture(scope="session")
def app_database_url(_postgres: tuple[str, str]) -> str:
    """The URL the app connects with in tests: the non-superuser table owner."""
    return _postgres[1]


@pytest.fixture
def app_engine(app_database_url: str) -> Iterator[Engine]:
    engine = create_engine(app_database_url)
    yield engine
    engine.dispose()


@pytest.fixture
def engine(database_url: str) -> Iterator[Engine]:
    engine = create_engine(database_url)
    tables = ", ".join(t.name for t in Base.metadata.sorted_tables)
    with engine.begin() as conn:
        conn.execute(text(f"TRUNCATE {tables} CASCADE"))
    yield engine
    engine.dispose()


@pytest.fixture
def db(engine: Engine) -> sessionmaker[Session]:
    """Session factory on the test database, for arranging and inspecting rows."""
    return sessionmaker(bind=engine, expire_on_commit=False)


@pytest.fixture
def app(db: sessionmaker[Session], app_engine: Engine) -> FastAPI:
    # `db` is requested first so the tables are truncated before the app runs
    app_sessions = sessionmaker(bind=app_engine, expire_on_commit=False)

    def override() -> Iterator[Session]:
        with app_sessions() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_session] = override
    return app


@pytest.fixture
def make_user(db: sessionmaker[Session]) -> MakeUser:
    """Insert an app_user as if they had signed in through the identity provider."""

    def make(email: str = "owner@example.org", name: str = "Olive Owner") -> AppUser:
        with db() as session:
            user = AppUser(oidc_issuer=TEST_ISSUER, oidc_subject=email, email=email, name=name)
            session.add(user)
            session.commit()
            session.refresh(user)
            return user

    return make


@pytest.fixture
def sign_in(db: sessionmaker[Session]) -> SignIn:
    """Give a client a real session for the user, as the sign-in callback would. Returns the
    cookie value."""

    def sign(client: TestClient, user: AppUser) -> str:
        settings = get_settings()
        with db() as session:
            token = create_session(session, user, settings, id_token="test-id-token")
            session.commit()
        client.cookies.set(settings.session_cookie_name, token)
        return token

    return sign


def _client(app: FastAPI) -> TestClient:
    return TestClient(app, headers={CSRF_HEADER: CSRF_HEADER_VALUE}, follow_redirects=False)


@pytest.fixture
def anon_client(app: FastAPI) -> Iterator[TestClient]:
    """No session; sends the CSRF header like the web app does."""
    with _client(app) as c:
        yield c


@pytest.fixture
def user(make_user: MakeUser) -> AppUser:
    return make_user()


@pytest.fixture
def client(app: FastAPI, user: AppUser, sign_in: SignIn) -> Iterator[TestClient]:
    """Signed in as `user`; sends the CSRF header like the web app does."""
    with _client(app) as c:
        sign_in(c, user)
        yield c


# Organisations and roles. `owner` is the same person as `user`, so `client` acts as the Owner.

AsUser = Callable[[AppUser], TestClient]
AddMember = Callable[[str, AppUser, str], None]


@pytest.fixture
def as_user(app: FastAPI, sign_in: SignIn) -> Iterator[AsUser]:
    """A factory for clients signed in as a given user, each with its own cookies."""
    clients: list[TestClient] = []

    def make(member: AppUser) -> TestClient:
        c = _client(app)
        sign_in(c, member)
        clients.append(c)
        return c

    yield make
    for c in clients:
        c.close()


@pytest.fixture
def owner(user: AppUser) -> AppUser:
    return user


@pytest.fixture
def standard(make_user: MakeUser) -> AppUser:
    return make_user("standard@example.org", "Sam Standard")


@pytest.fixture
def outsider(make_user: MakeUser) -> AppUser:
    return make_user("outsider@example.org", "Otto Outsider")


@pytest.fixture
def add_member(db: sessionmaker[Session]) -> AddMember:
    """Insert a membership directly, as accepting an invitation would."""

    def add(org_id: str, member: AppUser, role: str = "standard") -> None:
        with db() as session:
            session.add(Membership(org_id=uuid.UUID(org_id), user_id=member.id, role=role))
            session.commit()

    return add


@pytest.fixture
def org(client: TestClient, standard: AppUser, add_member: AddMember) -> str:
    """Id of an organisation created by `owner`, with `standard` as a Standard member."""
    res = client.post("/api/v1/organisations", json={"name": "Acme", "country": "NL"})
    assert res.status_code == 201, res.text
    org_id: str = res.json()["id"]
    add_member(org_id, standard, "standard")
    return org_id
