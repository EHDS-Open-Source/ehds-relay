"""An in-process identity provider for the sign-in flow tests.

It replaces only the network calls of the real client, so URL building, PKCE and the ID token
checks under test are the production code. The fake checks the PKCE verifier and the redirect
URI on token exchange, as a real provider would.
"""

import base64
import hashlib
import secrets
import time
from typing import Any
from urllib.parse import parse_qs, urlsplit

from joserfc import jwt
from joserfc.jwk import KeySetSerialization, RSAKey
from pydantic import SecretStr

from relay.auth.oidc import OIDCClient
from relay.settings import get_settings

FAKE_ISSUER = "https://idp.test/realms/relay"
AUTHORIZATION_ENDPOINT = f"{FAKE_ISSUER}/protocol/openid-connect/auth"
END_SESSION_ENDPOINT = f"{FAKE_ISSUER}/protocol/openid-connect/logout"


def _new_key() -> RSAKey:
    return RSAKey.generate_key(2048, parameters={"kid": secrets.token_hex(8)}, private=True)


class FakeOIDC(OIDCClient):
    def __init__(self) -> None:
        settings = get_settings().model_copy(
            update={"oidc_client_secret": SecretStr("test-secret")}
        )
        super().__init__(settings)
        self.key = _new_key()
        self.end_session_supported = True
        self.jwks_fetches = 0
        # code -> (claims, code_challenge, redirect_uri)
        self._codes: dict[str, tuple[dict[str, Any], str, str]] = {}

    # Network calls

    def _discovery(self) -> dict[str, Any]:
        meta: dict[str, Any] = {
            "issuer": FAKE_ISSUER,
            "authorization_endpoint": AUTHORIZATION_ENDPOINT,
            "token_endpoint": f"{FAKE_ISSUER}/protocol/openid-connect/token",
            "jwks_uri": f"{FAKE_ISSUER}/protocol/openid-connect/certs",
        }
        if self.end_session_supported:
            meta["end_session_endpoint"] = END_SESSION_ENDPOINT
        return meta

    def _fetch_jwks(self) -> KeySetSerialization:
        self.jwks_fetches += 1
        return {"keys": [self.key.as_dict(private=False)]}  # pyright: ignore[reportReturnType]

    def _fetch_token(self, *, code: str, redirect_uri: str, code_verifier: str) -> dict[str, Any]:
        if code not in self._codes:
            raise RuntimeError("invalid_grant: Code not valid")
        claims, challenge, expected_redirect = self._codes.pop(code)
        digest = hashlib.sha256(code_verifier.encode()).digest()
        if base64.urlsafe_b64encode(digest).rstrip(b"=").decode() != challenge:
            raise RuntimeError("invalid_grant: PKCE verification failed")
        if redirect_uri != expected_redirect:
            raise RuntimeError("invalid_grant: Incorrect redirect_uri")
        return {"access_token": "unused", "token_type": "Bearer", "id_token": self.sign(claims)}

    # Test helpers

    def sign(self, claims: dict[str, Any]) -> str:
        return jwt.encode({"alg": "RS256", "kid": self.key.kid}, claims, self.key)

    def rotate_key(self) -> None:
        self.key = _new_key()

    def authorize(self, authorization_url: str, **overrides: Any) -> str:
        """Play the user signing in at the provider: return a code for the given login URL.

        `overrides` replace or add ID token claims (pass a value of None to drop one).
        """
        query = {k: v[0] for k, v in parse_qs(urlsplit(authorization_url).query).items()}
        now = int(time.time())
        claims: dict[str, Any] = {
            "iss": FAKE_ISSUER,
            "aud": self.settings.oidc_client_id,
            "sub": "subject-owner",
            "email": "owner@example.org",
            "name": "Olive Owner",
            "nonce": query["nonce"],
            "iat": now,
            "exp": now + 300,
        }
        claims.update(overrides)
        claims = {k: v for k, v in claims.items() if v is not None}
        code = secrets.token_urlsafe(16)
        self._codes[code] = (claims, query["code_challenge"], query["redirect_uri"])
        return code
