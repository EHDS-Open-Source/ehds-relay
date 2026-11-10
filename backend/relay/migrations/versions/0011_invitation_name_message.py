"""invitation name and message

Revision ID: 0011
Revises: 0010
Create Date: 2026-11-10

Who is being invited and an optional personal note, both shown in the invitation email. The
columns are nullable: invitations created earlier have neither, and the API requires a name
for new ones.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0011"
down_revision: str | None = "0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("invitation", sa.Column("name", sa.Text(), nullable=True))
    op.add_column("invitation", sa.Column("message", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("invitation", "message")
    op.drop_column("invitation", "name")
