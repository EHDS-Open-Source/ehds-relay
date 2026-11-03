import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from relay.api import (
    capabilities,
    datasets,
    export,
    health,
    invitations,
    members,
    notifications,
    organisations,
    session,
)
from relay.auth.csrf import CSRFMiddleware
from relay.settings import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    logging.basicConfig(level=settings.log_level.upper())

    app = FastAPI(title="EHDS Relay API", version="0.1.0")
    # Added first so it sits inside CORS: its 403s still carry CORS headers
    app.add_middleware(CSRFMiddleware)
    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    app.include_router(health.router)
    app.include_router(organisations.router)
    app.include_router(datasets.router)
    app.include_router(members.router)
    app.include_router(notifications.router)
    app.include_router(invitations.org_router)
    app.include_router(invitations.router)
    app.include_router(export.router)
    app.include_router(session.router)
    app.include_router(capabilities.router)
    return app
