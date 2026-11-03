from enum import StrEnum

from pydantic import Field

from relay.dtos.base import DTO


class Edition(StrEnum):
    OPEN_SOURCE = "open-source"
    HOSTED = "hosted"


class CapabilityFeaturesDTO(DTO):
    """Hosted-service features. All false in the open-source edition."""

    subscription: bool = Field(description="Subscriptions, trials and seat limits")
    vocabulary_lookup: bool = Field(
        description="Vocabulary fields pick from official term lists instead of manual entry"
    )
    support_access: bool = Field(description="Support staff can open a session in an organisation")


class CapabilitiesDTO(DTO):
    """What this deployment offers, so the UI can show or hide features."""

    edition: Edition
    features: CapabilityFeaturesDTO
