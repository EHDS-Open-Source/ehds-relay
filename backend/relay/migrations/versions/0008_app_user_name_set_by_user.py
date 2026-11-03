"""app_user.name_set_by_user

Revision ID: 0008
Revises: 0007
Create Date: 2026-11-03

Remembers that a user changed their name in the app, so the next sign-in does not replace it
with the name from the identity provider.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0008"
down_revision: str | None = "0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "app_user",
        sa.Column("name_set_by_user", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("app_user", "name_set_by_user")
