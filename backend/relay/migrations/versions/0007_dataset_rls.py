"""row-level security on dataset

Revision ID: 0007
Revises: 0004
Create Date: 2026-11-03

Each request sets app.current_org_id for its transaction (see relay.db.set_tenant); the policy
then hides every other organisation's datasets and refuses to write rows for them. FORCE makes
it apply to the table owner too, which is the role the app connects as. With no setting,
nothing is visible: NULLIF turns the empty string left after a reset into NULL, which matches
no row, instead of failing the uuid cast.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0007"
# Comes after the invitation and job-queue migrations once those land; re-point to "0006" then.
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_CURRENT_ORG = "NULLIF(current_setting('app.current_org_id', true), '')::uuid"


def upgrade() -> None:
    op.execute("ALTER TABLE dataset ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE dataset FORCE ROW LEVEL SECURITY")
    op.execute(
        f"CREATE POLICY dataset_tenant ON dataset "
        f"USING (org_id = {_CURRENT_ORG}) WITH CHECK (org_id = {_CURRENT_ORG})"
    )


def downgrade() -> None:
    op.execute("DROP POLICY dataset_tenant ON dataset")
    op.execute("ALTER TABLE dataset NO FORCE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE dataset DISABLE ROW LEVEL SECURITY")
