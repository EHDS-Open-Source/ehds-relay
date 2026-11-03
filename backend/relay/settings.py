from functools import lru_cache

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration, read from RELAY_* environment variables."""

    model_config = SettingsConfigDict(env_prefix="RELAY_", env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg2://relay:relay@localhost:5432/relay"
    log_level: str = "info"
    # Browser origins allowed to call the API, as a JSON list, e.g. '["http://localhost:5173"]'.
    # Empty (the default) disables CORS.
    cors_origins: list[str] = []

    # OpenID Connect provider (Keycloak in development). The API is a confidential client.
    # The defaults match the Tilt port-forward, for running the API on the host.
    # Issuer as browsers and tokens see it; also what ID tokens must carry as `iss`.
    oidc_issuer_url: str = "http://localhost:8080/realms/ehds-relay"
    # Base URL for server-to-server calls (discovery, signing keys, token exchange) when the API
    # reaches the provider at a different address than browsers do, e.g. a cluster-internal
    # service URL. Defaults to the issuer URL.
    oidc_internal_url: str | None = None
    oidc_client_id: str = "ehds-relay-bff"
    # No default: set RELAY_OIDC_CLIENT_SECRET wherever sign-in is used.
    oidc_client_secret: SecretStr | None = None

    # Outgoing email (Mailpit in development, which accepts anything on its SMTP port)
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_from: str = "ehds-relay@example.org"

    @property
    def oidc_discovery_url(self) -> str:
        """Where the API fetches the OIDC discovery document from."""
        base = (self.oidc_internal_url or self.oidc_issuer_url).rstrip("/")
        return f"{base}/.well-known/openid-configuration"


@lru_cache
def get_settings() -> Settings:
    return Settings()
