from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine

import relay.domain.datasets  # pyright: ignore[reportUnusedImport] (registers models)
import relay.domain.email_outbox  # pyright: ignore[reportUnusedImport] (registers models)
import relay.domain.invitations  # pyright: ignore[reportUnusedImport] (registers models)
import relay.domain.memberships  # pyright: ignore[reportUnusedImport] (registers models)
import relay.domain.organisations  # pyright: ignore[reportUnusedImport] (registers models)
import relay.domain.users  # noqa: F401  # pyright: ignore[reportUnusedImport] (registers models)
from relay.db import Base
from relay.settings import get_settings

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def database_url() -> str:
    # Tests pass an explicit URL via config attributes; otherwise use settings
    return config.attributes.get("database_url") or get_settings().database_url


def run_migrations_offline() -> None:
    context.configure(url=database_url(), target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    engine = create_engine(database_url())
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()
    engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
