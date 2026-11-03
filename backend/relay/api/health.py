from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from relay.db import get_session
from relay.dtos.health import HealthDTO

router = APIRouter(tags=["health"])


@router.get("/healthz", response_model=HealthDTO)
def healthz() -> HealthDTO:
    """Liveness: the process is up."""
    return HealthDTO(status="ok")


@router.get("/readyz", response_model=HealthDTO)
def readyz(session: Annotated[Session, Depends(get_session)]) -> HealthDTO:
    """Readiness: the database is reachable."""
    try:
        session.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="database unavailable"
        ) from exc
    return HealthDTO(status="ok")
