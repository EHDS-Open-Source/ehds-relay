import uuid
from datetime import datetime

from sqlalchemy import DateTime, Index, Integer, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column

from relay.db import Base


class EmailOutbox(Base):
    """An email waiting to be sent, or already sent.

    The API inserts rows in the same transaction as the change they report, so an email goes
    out if and only if that change was committed. The worker sends pending rows and clears the
    bodies afterwards, so links in them do not linger in the table or its backups.
    """

    __tablename__ = "email_outbox"
    __table_args__ = (
        Index(
            "ix_email_outbox_pending", "next_attempt_at", postgresql_where=text("sent_at IS NULL")
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, server_default=text("gen_random_uuid()")
    )
    to_address: Mapped[str] = mapped_column(Text, nullable=False)
    subject: Mapped[str] = mapped_column(Text, nullable=False)
    text_body: Mapped[str | None] = mapped_column(Text)
    html_body: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    next_attempt_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_error: Mapped[str | None] = mapped_column(Text)
