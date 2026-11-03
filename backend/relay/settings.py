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

    # Sign-in and sessions. The browser reaches the API through the web app's origin, so the
    # OIDC redirect and the session cookie belong to web_url.
    web_url: str = "http://localhost:5173"
    oidc_scopes: str = "openid email profile"
    # Cookies on localhost ignore the port, so checkouts running side by side need different
    # names or they sign each other out.
    session_cookie_name: str = "relay_session"
    # A session ends after this long without a request...
    session_idle_minutes: int = 60
    # ...and after this long regardless of activity.
    session_max_hours: int = 12

    # Outgoing email (Mailpit in development, which accepts anything on its SMTP port)
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_from: str = "ehds-relay@example.org"
    # The worker stops retrying an email after this many failed attempts.
    email_max_attempts: int = 5

    # How long an invitation link stays valid
    invitation_ttl_days: int = 30

    @property
    def oidc_discovery_url(self) -> str:
        """Where the API fetches the OIDC discovery document from."""
        base = (self.oidc_internal_url or self.oidc_issuer_url).rstrip("/")
        return f"{base}/.well-known/openid-configuration"

    @property
    def web_base_url(self) -> str:
        return self.web_url.rstrip("/")

    @property
    def database_dsn(self) -> str:
        """`database_url` without SQLAlchemy's driver suffix, for libpq clients (the worker's
        job queue)."""
        scheme, sep, rest = self.database_url.partition("://")
        return f"{scheme.split('+', 1)[0]}{sep}{rest}"


@lru_cache
def get_settings() -> Settings:
    return Settings()
