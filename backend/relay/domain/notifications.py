import uuid
from enum import StrEnum

from sqlalchemy import Boolean, ForeignKey, Text, select
from sqlalchemy.orm import Mapped, Session, mapped_column

from relay.db import Base


class NotificationKind(StrEnum):
    """Courtesy emails a user can switch off.

    Mail the service cannot work without (invitations, sign-in) is not listed here and is always
    sent. To add a kind, add a member here and give it a label in the web app; every kind is on
    until the user switches it off, so no migration is needed.
    """

    REVALIDATION_REMINDER = "revalidation_reminder"


class UserNotificationSetting(Base):
    """A user's choice for one kind. Kinds with no row are on."""

    __tablename__ = "user_notification_setting"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("app_user.id", ondelete="CASCADE"), primary_key=True
    )
    kind: Mapped[str] = mapped_column(Text, primary_key=True)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False)


def notification_settings(session: Session, user_id: uuid.UUID) -> dict[NotificationKind, bool]:
    """Every kind with the user's choice, on where they have not chosen."""
    rows = session.execute(
        select(UserNotificationSetting.kind, UserNotificationSetting.enabled).where(
            UserNotificationSetting.user_id == user_id
        )
    ).all()
    stored = {kind: enabled for kind, enabled in rows}
    return {kind: stored.get(kind.value, True) for kind in NotificationKind}


def is_enabled(session: Session, user_id: uuid.UUID, kind: NotificationKind) -> bool:
    """Whether to send this user a courtesy email of this kind. Check it before queuing one."""
    return notification_settings(session, user_id)[kind]


def set_notification(
    session: Session, user_id: uuid.UUID, kind: NotificationKind, enabled: bool
) -> None:
    row = session.get(UserNotificationSetting, (user_id, kind.value))
    if row is None:
        session.add(UserNotificationSetting(user_id=user_id, kind=kind.value, enabled=enabled))
    else:
        row.enabled = enabled
