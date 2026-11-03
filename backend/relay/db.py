import uuid
from collections.abc import Iterator
from functools import lru_cache
from typing import Any

from sqlalchemy import Connection, Engine, create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, Session, SessionTransaction, sessionmaker

from relay.settings import get_settings


class Base(DeclarativeBase):
    pass


@lru_cache
def get_engine() -> Engine:
    return create_engine(get_settings().database_url, pool_pre_ping=True)


@lru_cache
def get_sessionmaker() -> sessionmaker[Session]:
    return sessionmaker(bind=get_engine(), expire_on_commit=False)


def get_session() -> Iterator[Session]:
    """FastAPI dependency: one session per request, committed by the handler."""
    with get_sessionmaker()() as session:
        yield session


# Row-level security on tenant tables compares org_id with this setting. It is set with
# is_local=true, so it lasts only until the transaction ends and never leaks to the next
# user of a pooled connection.
TENANT_SETTING = "app.current_org_id"
_TENANT_KEY = "org_id"
_SET_TENANT = text(f"SELECT set_config('{TENANT_SETTING}', :org_id, true)")


def set_tenant(session: Session, org_id: uuid.UUID) -> None:
    """Scope the session to one organisation, for the rest of its life.

    Applies to the open transaction (if any) and to every later one: handlers commit and
    then refresh, which starts a new transaction where the setting would otherwise be gone.
    """
    session.info[_TENANT_KEY] = org_id
    if session.in_transaction():
        session.connection().execute(_SET_TENANT, {"org_id": str(org_id)})


@event.listens_for(Session, "after_begin")
def _apply_tenant(session: Session, transaction: SessionTransaction, connection: Connection) -> Any:
    org_id = session.info.get(_TENANT_KEY)
    if org_id is not None:
        connection.execute(_SET_TENANT, {"org_id": str(org_id)})
