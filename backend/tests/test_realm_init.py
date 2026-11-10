# pyright: basic
"""Tests for the dev realm-init job (deploy/helm/ehds-relay/files/realm-init).

The job is stdlib-only code mounted into a stock python image, so it is loaded by path here.
"""

import importlib
import json
import logging
import re
import sys
import textwrap
from collections.abc import Iterator
from pathlib import Path
from types import ModuleType

import pytest

REALM_INIT_DIR = (
    Path(__file__).resolve().parents[2] / "deploy" / "helm" / "ehds-relay" / "files" / "realm-init"
)
REALM_FILE = REALM_INIT_DIR.parent / "ehds-relay-realm.json"


@pytest.fixture(scope="module")
def realm_init() -> Iterator[ModuleType]:
    sys.path.insert(0, str(REALM_INIT_DIR))
    try:
        module = importlib.import_module("realm_init")
        importlib.import_module("migrations")
        yield module
    finally:
        sys.path.remove(str(REALM_INIT_DIR))
        for name in [n for n in sys.modules if n == "migrations" or n.startswith("migrations.")]:
            del sys.modules[name]
        sys.modules.pop("realm_init", None)


class FakeAdmin:
    def __init__(self, version: int = 0, fail_on: int | None = None):
        self.version = version
        self.fail_on = fail_on
        self.versions_set: list[int] = []
        self.ran: list[int] = []

    def get_realm_version(self) -> int:
        return self.version

    def set_realm_version(self, version: int) -> None:
        self.version = version
        self.versions_set.append(version)


def make_package(tmp_path: Path, monkeypatch, files: dict[str, str], name: str) -> ModuleType:
    package = tmp_path / name
    package.mkdir()
    (package / "__init__.py").write_text("")
    for filename, body in files.items():
        (package / filename).write_text(textwrap.dedent(body))
    monkeypatch.syspath_prepend(str(tmp_path))
    return importlib.import_module(name)


def migration(version: int) -> str:
    return f"""
        VERSION = {version}
        DESCRIPTION = "migration {version}"
        def migrate(admin):
            admin.ran.append({version})
            if admin.fail_on == {version}:
                raise RuntimeError("boom")
    """


def test_shipped_migrations_are_valid(realm_init: ModuleType) -> None:
    migrations = importlib.import_module("migrations")
    found = migrations.discover(migrations)
    assert [m.VERSION for m in found] == list(range(1, len(found) + 1))
    assert found[0].VERSION == 1


def test_discovery_orders_and_skips_underscore(tmp_path, monkeypatch, realm_init) -> None:
    pkg = make_package(
        tmp_path,
        monkeypatch,
        {
            "m002_b.py": migration(2),
            "m001_a.py": migration(1),
            "_helpers.py": "raise RuntimeError('must not be imported')",
        },
        "mig_ok",
    )
    found = importlib.import_module("migrations").discover(pkg)
    assert [m.VERSION for m in found] == [1, 2]


def test_discovery_rejects_a_gap(tmp_path, monkeypatch, realm_init) -> None:
    pkg = make_package(
        tmp_path, monkeypatch, {"m001_a.py": migration(1), "m003_c.py": migration(3)}, "mig_gap"
    )
    with pytest.raises(RuntimeError, match="contiguous"):
        importlib.import_module("migrations").discover(pkg)


def test_discovery_rejects_duplicate_versions(tmp_path, monkeypatch, realm_init) -> None:
    pkg = make_package(
        tmp_path, monkeypatch, {"m001_a.py": migration(1), "m001_b.py": migration(1)}, "mig_dup"
    )
    with pytest.raises(RuntimeError, match="duplicate migration VERSION 1"):
        importlib.import_module("migrations").discover(pkg)


def test_discovery_rejects_missing_attribute(tmp_path, monkeypatch, realm_init) -> None:
    pkg = make_package(
        tmp_path, monkeypatch, {"m001_a.py": "VERSION = 1\ndef migrate(admin): pass"}, "mig_attr"
    )
    with pytest.raises(RuntimeError, match="does not define DESCRIPTION"):
        importlib.import_module("migrations").discover(pkg)


def load(tmp_path, monkeypatch, versions: list[int], name: str):
    pkg = make_package(
        tmp_path, monkeypatch, {f"m{v:03d}_x.py": migration(v) for v in versions}, name
    )
    return importlib.import_module("migrations").discover(pkg)


def test_runner_applies_only_newer_versions_stepwise(
    tmp_path, monkeypatch, realm_init, caplog
) -> None:
    migrations = load(tmp_path, monkeypatch, [1, 2, 3], "mig_run")
    admin = FakeAdmin(version=1)
    with caplog.at_level(logging.INFO, logger="realm_migrations"):
        importlib.import_module("migrations").run_migrations(admin, migrations)
    assert admin.ran == [2, 3]
    assert admin.versions_set == [2, 3]
    assert "at version 1, target 3" in caplog.text


def test_runner_runs_each_migration_once(tmp_path, monkeypatch, realm_init, caplog) -> None:
    migrations = load(tmp_path, monkeypatch, [1, 2], "mig_once")
    admin = FakeAdmin()
    runner = importlib.import_module("migrations").run_migrations
    runner(admin, migrations)
    admin.ran = []
    with caplog.at_level(logging.INFO, logger="realm_migrations"):
        runner(admin, migrations)
    assert admin.ran == []
    assert admin.version == 2
    assert "at version 2, target 2" in caplog.text
    assert "up to date" in caplog.text


def test_runner_keeps_earlier_versions_when_a_later_one_fails(
    tmp_path, monkeypatch, realm_init
) -> None:
    migrations = load(tmp_path, monkeypatch, [1, 2, 3], "mig_fail")
    admin = FakeAdmin(fail_on=2)
    with pytest.raises(RuntimeError, match="boom"):
        importlib.import_module("migrations").run_migrations(admin, migrations)
    assert admin.version == 1
    assert admin.versions_set == [1]


ENV = {
    "RELAY_WEB_URL": "http://localhost:5199",
    "RELAY_API_URL": "http://localhost:8000",
    "RELAY_OIDC_CLIENT_SECRET": 'se"cret',
    "RELAY_SMTP_HOST": "mail",
    "RELAY_SMTP_PORT": "1025",
    "RELAY_SMTP_FROM": "from@example.org",
}


def test_import_payload_uses_skip_and_allowed_collections_only(realm_init) -> None:
    definition = realm_init.load_realm_definition(str(REALM_FILE), ENV)
    payload = realm_init.build_import_payload(definition)
    assert payload["ifResourceExists"] == "SKIP"
    assert set(payload) <= {"ifResourceExists", *realm_init.IMPORT_COLLECTIONS}
    assert "smtpServer" not in payload and "realm" not in payload
    client = payload["clients"][0]
    assert client["redirectUris"] == ["http://localhost:5199/*", "http://localhost:8000/*"]
    assert client["secret"] == 'se"cret'
    assert {u["username"] for u in payload["users"]} == {"owner", "standard", "invitee"}
    assert all(u["id"] for u in payload["users"])
    assert "${" not in json.dumps(payload)


def test_unset_placeholder_is_an_error(realm_init) -> None:
    with pytest.raises(realm_init.RealmInitError, match="RELAY_WEB_URL"):
        realm_init.substitute_placeholders("${RELAY_WEB_URL}", {})


def test_empty_definition_has_nothing_to_import(realm_init) -> None:
    assert realm_init.build_import_payload({"realm": "x"}) is None


class FakeKeycloak:
    def __init__(self, client: dict | None):
        self.client = client
        self.updated: list[tuple[str, dict]] = []

    def find_client(self, client_id: str):
        return self.client

    def update_client(self, uuid: str, client: dict) -> None:
        self.updated.append((uuid, client))


def test_refresh_updates_redirects_secret_and_keeps_other_fields(realm_init) -> None:
    definition = realm_init.load_realm_definition(str(REALM_FILE), ENV)
    existing = {
        "id": "uuid-1",
        "clientId": "ehds-relay-bff",
        "redirectUris": ["http://localhost:5173/*"],
        "webOrigins": [],
        "secret": "old",
        "attributes": {"post.logout.redirect.uris": "x", "other": "kept"},
        "consentRequired": True,
    }
    kc = FakeKeycloak(existing)
    realm_init.refresh_clients(kc, definition)
    ((uuid, updated),) = kc.updated
    assert uuid == "uuid-1"
    assert updated["redirectUris"] == ["http://localhost:5199/*", "http://localhost:8000/*"]
    assert updated["secret"] == 'se"cret'
    assert updated["attributes"]["other"] == "kept"
    assert updated["attributes"]["post.logout.redirect.uris"] == (
        "http://localhost:5199/*##http://localhost:8000/*"
    )
    assert updated["consentRequired"] is True
    assert updated["baseUrl"] == "http://localhost:5199/"
    # A second run with the result changes nothing
    kc2 = FakeKeycloak(updated)
    realm_init.refresh_clients(kc2, definition)
    assert kc2.updated == []


def test_refresh_skips_a_client_that_does_not_exist_yet(realm_init) -> None:
    definition = realm_init.load_realm_definition(str(REALM_FILE), ENV)
    kc = FakeKeycloak(None)
    realm_init.refresh_clients(kc, definition)
    assert kc.updated == []


# The realm JSON itself


def test_realm_enables_the_password_flows(realm_init) -> None:
    definition = realm_init.load_realm_definition(str(REALM_FILE), ENV)
    assert definition["registrationAllowed"] is True
    assert definition["resetPasswordAllowed"] is True
    assert definition["verifyEmail"] is True
    assert definition["loginWithEmailAllowed"] is True
    assert definition["duplicateEmailsAllowed"] is False
    assert definition["smtpServer"]["host"] == "mail"
    assert definition["smtpServer"]["port"] == "1025"
    assert definition["smtpServer"]["from"] == "from@example.org"
    client = definition["clients"][0]
    assert client["baseUrl"] == "http://localhost:5199/"
    assert "http://localhost:5199/*" in client["redirectUris"]


def test_realm_json_and_migration_agree_on_password_settings(realm_init) -> None:
    definition = realm_init.load_realm_definition(str(REALM_FILE), ENV)
    m002 = importlib.import_module("migrations.m002_password_settings")
    assert definition["passwordPolicy"] == m002.PASSWORD_POLICY
    assert definition["actionTokenGeneratedByUserLifespan"] == 300
    assert m002.ACTION_TOKEN_LIFESPAN_SECONDS == 300
    policy = dict(
        re.fullmatch(r"(\w+)(?:\((\d+)\))?", part).groups()  # type: ignore[union-attr]
        for part in definition["passwordPolicy"].split(" and ")
    )
    assert policy == {
        "length": "12",
        "upperCase": "1",
        "lowerCase": "1",
        "digits": "1",
        "specialChars": "1",
        "notUsername": None,
        "notEmail": None,
        "maxLength": "128",
    }


def test_dev_user_passwords_meet_the_policy(realm_init) -> None:
    """Keycloak checks the policy when it imports users, so a weak dev password would break it."""
    definition = realm_init.load_realm_definition(str(REALM_FILE), ENV)
    for user in definition["users"]:
        (credential,) = user["credentials"]
        password = credential["value"]
        assert 12 <= len(password) <= 128, user["username"]
        assert re.search(r"[A-Z]", password), user["username"]
        assert re.search(r"[a-z]", password), user["username"]
        assert re.search(r"[0-9]", password), user["username"]
        assert re.search(r"[^A-Za-z0-9]", password), user["username"]
        assert password.lower() not in (user["username"].lower(), user["email"].lower())


class FakeRealm:
    def __init__(self, realm: dict):
        self.realm = realm
        self.puts = 0

    def get_realm(self) -> dict:
        return json.loads(json.dumps(self.realm))

    def update_realm(self, realm: dict) -> None:
        self.realm = realm
        self.puts += 1


def test_m002_sets_policy_and_lifetime_and_keeps_other_settings(realm_init) -> None:
    m002 = importlib.import_module("migrations.m002_password_settings")
    admin = FakeRealm({"realm": "ehds-relay", "rememberMe": True, "attributes": {"a": "b"}})
    m002.migrate(admin)
    assert admin.realm["passwordPolicy"] == m002.PASSWORD_POLICY
    assert admin.realm["actionTokenGeneratedByUserLifespan"] == 300
    assert admin.realm["rememberMe"] is True
    assert admin.realm["attributes"] == {"a": "b"}
    assert admin.puts == 1
    # Idempotent, and a no-op on a fresh realm that got the settings from the JSON
    m002.migrate(admin)
    assert admin.puts == 1


def test_m002_follows_the_baseline(realm_init) -> None:
    migrations = importlib.import_module("migrations")
    versions = [m.VERSION for m in migrations.discover(migrations)]
    assert versions[:2] == [1, 2]
