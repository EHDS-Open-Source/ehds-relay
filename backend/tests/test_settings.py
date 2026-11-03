import pytest

from relay.settings import Settings


def test_oidc_discovery_defaults_to_issuer() -> None:
    settings = Settings(oidc_issuer_url="http://idp.example/realms/r/")
    assert (
        settings.oidc_discovery_url
        == "http://idp.example/realms/r/.well-known/openid-configuration"
    )


def test_oidc_discovery_prefers_internal_url() -> None:
    settings = Settings(
        oidc_issuer_url="http://localhost:8080/realms/r",
        oidc_internal_url="http://keycloak:8080/realms/r",
    )
    assert (
        settings.oidc_discovery_url
        == "http://keycloak:8080/realms/r/.well-known/openid-configuration"
    )


def test_oidc_client_secret_is_optional_and_not_leaked(monkeypatch: pytest.MonkeyPatch) -> None:
    assert Settings().oidc_client_secret is None
    monkeypatch.setenv("RELAY_OIDC_CLIENT_SECRET", "s3cret")
    settings = Settings()
    assert settings.oidc_client_secret is not None
    assert settings.oidc_client_secret.get_secret_value() == "s3cret"
    assert "s3cret" not in repr(settings)
