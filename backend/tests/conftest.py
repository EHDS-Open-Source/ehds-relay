from collections.abc import Callable, Iterator

import pytest
from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine, text
from sqlalchemy.orm import Session, sessionmaker
from testcontainers.community.postgres import PostgresContainer

from relay.app import create_app
from relay.auth.csrf import CSRF_HEADER, CSRF_HEADER_VALUE
from relay.auth.sessions import create_session
from relay.db import Base, get_session
from relay.domain.users import AppUser
from relay.settings import get_settings

TEST_ISSUER = "https://idp.test/realms/relay"

MakeUser = Callable[..., AppUser]
SignIn = Callable[[TestClient, AppUser], str]


@pytest.fixture(scope="session")
def database_url() -> Iterator[str]:
    with PostgresContainer("postgres:17", driver="psycopg2") as pg:
        url = pg.get_connection_url()
        cfg = Config("alembic.ini")
        cfg.attributes["database_url"] = url
        command.upgrade(cfg, "head")
        yield url


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
def app(db: sessionmaker[Session]) -> FastAPI:
    def override() -> Iterator[Session]:
        with db() as session:
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
