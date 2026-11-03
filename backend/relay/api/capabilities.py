from typing import NoReturn

from fastapi import APIRouter

from relay.api.stubs import not_implemented
from relay.dtos.capabilities import CapabilitiesDTO

router = APIRouter(prefix="/api/v1/capabilities", tags=["capabilities"])


@router.get("", response_model=CapabilitiesDTO)
def get_capabilities() -> NoReturn:
    not_implemented()
