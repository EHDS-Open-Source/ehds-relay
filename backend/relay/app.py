import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from relay.api import datasets, health, organisations
from relay.settings import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    logging.basicConfig(level=settings.log_level.upper())

    app = FastAPI(title="EHDS Relay API", version="0.1.0")
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
    return app
