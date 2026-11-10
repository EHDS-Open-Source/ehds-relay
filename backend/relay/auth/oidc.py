"""The OpenID Connect provider, seen from the API as a confidential client.

Only three things are needed from the provider: a sign-in URL, the user's identity in exchange
for an authorisation code, and a sign-out URL. Tests replace `get_oidc_client` with a fake that
overrides the network calls (`_discovery`, `_fetch_jwks`, `_fetch_token`).
"""

import logging
from collections.abc import Mapping
from dataclasses import dataclass
from functools import lru_cache
from typing import Any, Self, cast
from urllib.parse import urlencode

import requests
from authlib.integrations.requests_client import (  # pyright: ignore[reportMissingTypeStubs]
    OAuth2Session,
)
from joserfc import jwt
from joserfc.errors import InvalidKeyIdError, JoseError
from joserfc.jwk import KeySet, KeySetSerialization

from relay.settings import Settings, get_settings

log = logging.getLogger(__name__)

HTTP_TIMEOUT_SECONDS = 10
# Asymmetric only: the client secret must never be accepted as a signing key
ID_TOKEN_ALGORITHMS = ["RS256", "RS384", "RS512", "PS256", "PS384", "PS512", "ES256", "ES384"]
CLOCK_LEEWAY_SECONDS = 60


class OIDCError(Exception):
    """Sign-in with the provider failed. The message is safe to log (no tokens)."""


@dataclass(frozen=True)
class IdentityClaims:
    issuer: str
    subject: str
    email: str
    name: str
    id_token: str

    @classmethod
    def from_claims(cls, claims: dict[str, Any], id_token: str) -> Self:
        email = claims.get("email")
        if not isinstance(email, str) or not email:
            raise OIDCError("ID token has no email claim")
        name = claims.get("name") or claims.get("preferred_username") or email
        return cls(
            issuer=str(claims["iss"]),
            subject=str(claims["sub"]),
            email=email,
            name=str(name),
            id_token=id_token,
        )


class OIDCClient:
    """Authorisation-code flow with PKCE against the configured provider.

    The discovery document and signing keys are fetched on first use and cached, so the API
    starts and serves health checks while the provider is down.
    """

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._metadata: dict[str, Any] | None = None
        self._keys: KeySet | None = None

    # Network calls, overridden in tests

    def _discovery(self) -> dict[str, Any]:
        res = requests.get(self.settings.oidc_discovery_url, timeout=HTTP_TIMEOUT_SECONDS)
        res.raise_for_status()
        return cast(dict[str, Any], res.json())

    def _fetch_jwks(self) -> KeySetSerialization:
        res = requests.get(self.metadata["jwks_uri"], timeout=HTTP_TIMEOUT_SECONDS)
        res.raise_for_status()
        return cast(KeySetSerialization, res.json())

    def _fetch_token(self, *, code: str, redirect_uri: str, code_verifier: str) -> dict[str, Any]:
        oauth = self._oauth_session(redirect_uri)
        try:
            token = oauth.fetch_token(
                self.metadata["token_endpoint"],
                grant_type="authorization_code",
                code=code,
                code_verifier=code_verifier,
                timeout=HTTP_TIMEOUT_SECONDS,
            )
        finally:
            oauth.close()
        return cast(dict[str, Any], token)

    # Helpers

    @property
    def metadata(self) -> dict[str, Any]:
        if self._metadata is None:
            self._metadata = self._discovery()
        return self._metadata

    @property
    def issuer(self) -> str:
        """The issuer the provider publishes; ID tokens must carry exactly this."""
        return str(self.metadata["issuer"])

    def _key_set(self, *, refresh: bool = False) -> KeySet:
        if self._keys is None or refresh:
            self._keys = KeySet.import_key_set(self._fetch_jwks())
        return self._keys

    def _oauth_session(self, redirect_uri: str) -> Any:
        # Any: Authlib ships no type information. It is a requests.Session.
        secret = self.settings.oidc_client_secret
        if secret is None:
            raise OIDCError("RELAY_OIDC_CLIENT_SECRET is not set")
        return OAuth2Session(
            client_id=self.settings.oidc_client_id,
            client_secret=secret.get_secret_value(),
            scope=self.settings.oidc_scopes,
            redirect_uri=redirect_uri,
            code_challenge_method="S256",
        )

    # The interface the routes use

    def authorization_url(
        self,
        *,
        redirect_uri: str,
        state: str,
        nonce: str,
        code_verifier: str,
        extra_params: Mapping[str, str] | None = None,
    ) -> str:
        """The provider's sign-in URL. `extra_params` adds query parameters such as `prompt`."""
        extra = dict(extra_params or {})
        oauth = self._oauth_session(redirect_uri)
        try:
            url, _ = oauth.create_authorization_url(
                self.metadata["authorization_endpoint"],
                state=state,
                code_verifier=code_verifier,
                nonce=nonce,
                **extra,
            )
        finally:
            oauth.close()
        return cast(str, url)

    def exchange(
        self, *, code: str, redirect_uri: str, code_verifier: str, nonce: str
    ) -> IdentityClaims:
        """Swap the authorisation code for tokens and return the verified identity."""
        try:
            token = self._fetch_token(
                code=code, redirect_uri=redirect_uri, code_verifier=code_verifier
            )
        except Exception as exc:
            # Provider errors read like "invalid_grant: Code not valid"; no tokens in them
            raise OIDCError(f"token exchange failed: {type(exc).__name__}: {exc}") from None
        id_token = token.get("id_token")
        if not isinstance(id_token, str):
            raise OIDCError("token response has no id_token")
        return IdentityClaims.from_claims(self.verify_id_token(id_token, nonce=nonce), id_token)

    def verify_id_token(self, id_token: str, *, nonce: str) -> dict[str, Any]:
        """Check the signature against the provider's published keys, then the claims."""
        try:
            try:
                decoded = jwt.decode(id_token, self._key_set(), algorithms=ID_TOKEN_ALGORITHMS)
            except InvalidKeyIdError:
                # The provider rotated its keys since we last fetched them
                decoded = jwt.decode(
                    id_token, self._key_set(refresh=True), algorithms=ID_TOKEN_ALGORITHMS
                )
            jwt.JWTClaimsRegistry(
                leeway=CLOCK_LEEWAY_SECONDS,
                iss={"essential": True, "value": self.issuer},
                aud={"essential": True, "value": self.settings.oidc_client_id},
                sub={"essential": True},
                exp={"essential": True},
                nonce={"essential": True, "value": nonce},
            ).validate(decoded.claims)
        except JoseError as exc:
            raise OIDCError(f"invalid ID token: {exc}") from None
        return decoded.claims

    def end_session_url(self, *, id_token_hint: str, post_logout_redirect_uri: str) -> str | None:
        """Where to send the browser to end the provider's own session, if it supports that.

        Without this the provider's single sign-on cookie survives and the next sign-in is
        silent.
        """
        endpoint = self.metadata.get("end_session_endpoint")
        if not isinstance(endpoint, str):
            return None
        query = urlencode(
            {
                "id_token_hint": id_token_hint,
                "client_id": self.settings.oidc_client_id,
                "post_logout_redirect_uri": post_logout_redirect_uri,
            }
        )
        return f"{endpoint}?{query}"


@lru_cache
def get_oidc_client() -> OIDCClient:
    """FastAPI dependency: one client per process, so discovery and keys are cached."""
    return OIDCClient(get_settings())
