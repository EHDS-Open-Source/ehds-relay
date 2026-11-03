"""dataset revalidation reminder and last validation dates

Revision ID: 0009
Revises: 0008
Create Date: 2026-11-03

Adds the reminder date a member sets on a dataset (with who set it, when, and when the reminder
email went out), plus the two dates the overdue flag is worked out from: when the record last
passed the publish checks, and when it was last revalidated. These are app data and never part
of the exported metadata.

Datasets that are already published get `published_at` from their last change. Row-level
security is forced on this table, so even the owner role sees no rows without a tenant; the
backfill turns that off for its one statement and back on.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0009"
down_revision: str | None = "0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_TS = sa.DateTime(timezone=True)


def upgrade() -> None:
    op.add_column("dataset", sa.Column("reminder_date", sa.Date()))
    op.add_column(
        "dataset",
        sa.Column(
            "reminder_set_by",
            sa.Uuid(),
            sa.ForeignKey("app_user.id", ondelete="SET NULL", name="fk_dataset_reminder_set_by"),
        ),
    )
    op.add_column("dataset", sa.Column("reminder_set_at", _TS))
    op.add_column("dataset", sa.Column("reminder_sent_at", _TS))
    op.add_column("dataset", sa.Column("published_at", _TS))
    op.add_column("dataset", sa.Column("last_revalidated_at", _TS))
    op.create_index(
        "ix_dataset_reminder_due",
        "dataset",
        ["reminder_date"],
        postgresql_where=sa.text("reminder_date IS NOT NULL AND reminder_sent_at IS NULL"),
    )

    op.execute("ALTER TABLE dataset NO FORCE ROW LEVEL SECURITY")
    op.execute("UPDATE dataset SET published_at = updated_at WHERE status = 'published'")
    op.execute("ALTER TABLE dataset FORCE ROW LEVEL SECURITY")


def downgrade() -> None:
    op.drop_index("ix_dataset_reminder_due", table_name="dataset")
    op.drop_column("dataset", "last_revalidated_at")
    op.drop_column("dataset", "published_at")
    op.drop_column("dataset", "reminder_sent_at")
    op.drop_column("dataset", "reminder_set_at")
    op.drop_column("dataset", "reminder_set_by")
    op.drop_column("dataset", "reminder_date")
