"""procrastinate job queue schema

The worker's job queue (Procrastinate) keeps its tables in the same database. Its schema is
installed here so there is one migration path. The SQL is a verbatim copy of the schema shipped
with the pinned Procrastinate version; when Procrastinate is upgraded, add a new migration that
runs the migration scripts it ships for that upgrade, and leave this one unchanged.

Revision ID: 0006
Revises: 0005
Create Date: 2026-11-03
"""

from collections.abc import Sequence
from pathlib import Path

from alembic import op

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SCHEMA_SQL = Path(__file__).parent.parent / "sql" / "procrastinate_schema_3_10_0.sql"


def _run_script(sql: str) -> None:
    # Straight to the driver: the script holds `%` and `:` that SQLAlchemy or the driver would
    # otherwise treat as parameter markers.
    cursor = op.get_bind().connection.cursor()
    try:
        cursor.execute(sql)
    finally:
        cursor.close()


def upgrade() -> None:
    _run_script(SCHEMA_SQL.read_text(encoding="utf-8"))


def downgrade() -> None:
    _run_script(
        """
        DROP TABLE IF EXISTS procrastinate_events, procrastinate_periodic_defers,
            procrastinate_jobs, procrastinate_workers CASCADE;
        DROP TYPE IF EXISTS procrastinate_job_to_defer_v1, procrastinate_job_event_type,
            procrastinate_job_status CASCADE;
        DO $$
        DECLARE f record;
        BEGIN
            FOR f IN
                SELECT p.oid::regprocedure AS sig FROM pg_proc p
                JOIN pg_namespace n ON n.oid = p.pronamespace
                WHERE n.nspname = current_schema() AND p.proname LIKE 'procrastinate\\_%'
            LOOP
                EXECUTE 'DROP FUNCTION IF EXISTS ' || f.sig || ' CASCADE';
            END LOOP;
        END;
        $$;
        """
    )
