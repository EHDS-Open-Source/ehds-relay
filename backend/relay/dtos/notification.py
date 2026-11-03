from pydantic import Field

from relay.domain.notifications import NotificationKind
from relay.dtos.base import DTO, RequestDTO


class NotificationSettingDTO(DTO):
    """Whether one kind of notification is sent to the signed-in user."""

    kind: NotificationKind
    enabled: bool


class NotificationSettingsDTO(DTO):
    """Every kind of notification the user can switch, with its current setting."""

    settings: list[NotificationSettingDTO]


class NotificationSettingsUpdateDTO(RequestDTO):
    """New settings for some kinds; kinds left out keep their setting."""

    settings: list[NotificationSettingDTO] = Field(max_length=len(NotificationKind))
