from collections.abc import Iterator

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker
from testcontainers.community.postgres import PostgresContainer

from relay.app import create_app
from relay.db import get_session


@pytest.fixture(scope="session")
def database_url() -> Iterator[str]:
    with PostgresContainer("postgres:17", driver="psycopg2") as pg:
        url = pg.get_connection_url()
        cfg = Config("alembic.ini")
        cfg.attributes["database_url"] = url
        command.upgrade(cfg, "head")
        yield url


@pytest.fixture
def client(database_url: str) -> Iterator[TestClient]:
    engine = create_engine(database_url)
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE organisation"))
    factory = sessionmaker(bind=engine, expire_on_commit=False)

    def override() -> Iterator[Session]:
        with factory() as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_session] = override
    with TestClient(app) as c:
        yield c
    engine.dispose()
