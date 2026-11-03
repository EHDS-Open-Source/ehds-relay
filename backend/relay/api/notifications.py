"""The signed-in user's choice of which courtesy emails they receive."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from relay.auth.deps import CurrentUserDep
from relay.db import get_session
from relay.domain.notifications import notification_settings, set_notification
from relay.domain.users import AppUser
from relay.dtos.notification import (
    NotificationSettingDTO,
    NotificationSettingsDTO,
    NotificationSettingsUpdateDTO,
)

router = APIRouter(prefix="/api/v1/me/notifications", tags=["notifications"])

DbDep = Annotated[Session, Depends(get_session)]


def _settings(db: Session, user: AppUser) -> NotificationSettingsDTO:
    return NotificationSettingsDTO(
        settings=[
            NotificationSettingDTO(kind=kind, enabled=enabled)
            for kind, enabled in notification_settings(db, user.id).items()
        ]
    )


@router.get("", response_model=NotificationSettingsDTO)
def get_notifications(user: CurrentUserDep, db: DbDep) -> NotificationSettingsDTO:
    return _settings(db, user)


@router.put("", response_model=NotificationSettingsDTO)
def update_notifications(
    body: NotificationSettingsUpdateDTO, user: CurrentUserDep, db: DbDep
) -> NotificationSettingsDTO:
    for item in body.settings:
        set_notification(db, user.id, item.kind, item.enabled)
    db.commit()
    return _settings(db, user)
