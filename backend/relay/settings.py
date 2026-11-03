from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration, read from RELAY_* environment variables."""

    model_config = SettingsConfigDict(env_prefix="RELAY_", env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg2://relay:relay@localhost:5432/relay"
    log_level: str = "info"
    # Browser origins allowed to call the API, as a JSON list, e.g. '["http://localhost:5173"]'.
    # Empty (the default) disables CORS.
    cors_origins: list[str] = []


@lru_cache
def get_settings() -> Settings:
    return Settings()
