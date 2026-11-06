"""Keep the dev Keycloak realm in step with the chart, without touching existing users.

Run on every start of the realm-init pod, in order:
  1. wait for Keycloak and sign in as the master admin (dev only);
  2. refresh values that follow the local setup (client redirect URIs and secret, realm SMTP);
  3. partial-import clients, roles, groups and users from the realm JSON, skipping what exists;
  4. run the ordered, run-once migrations (see migrations/__init__.py).
Realm-level settings are never replayed from the JSON, so edits made in the console survive.

Standard library only. `python realm_init.py --status` prints user ids and the realm version as
JSON (used by scripts/check-keycloak-restart.sh).
"""

import json
import logging
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

logger = logging.getLogger("realm_init")

VERSION_ATTRIBUTE = "relay_realm_version"
# The only collections sent to partial import. Realm settings are deliberately left out.
IMPORT_COLLECTIONS = ("roles", "groups", "clients", "identityProviders", "users")
_PLACEHOLDER = re.compile(r"\$\{(RELAY_[A-Z0-9_]+)\}")


class RealmInitError(Exception):
    pass


class Admin:
    """Minimal Keycloak admin API client for one realm."""

    def __init__(self, base_url: str, realm: str):
        self.base_url = base_url.rstrip("/")
        self.realm = realm
        self.token = ""

    def request(self, method, path, body=None, expect=(200, 201, 204)):
        data = None if body is None else json.dumps(body).encode()
        req = urllib.request.Request(self.base_url + path, data=data, method=method)
        req.add_header("Content-Type", "application/json")
        if self.token:
            req.add_header("Authorization", f"Bearer {self.token}")
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                status, raw = resp.status, resp.read()
        except urllib.error.HTTPError as exc:
            status, raw = exc.code, exc.read()
        if status not in expect:
            raise RealmInitError(f"{method} {path} -> {status}: {raw[:300]!r}")
        return json.loads(raw) if raw else None

    def login(self, user: str, password: str) -> None:
        form = urllib.parse.urlencode(
            {
                "client_id": "admin-cli",
                "grant_type": "password",
                "username": user,
                "password": password,
            }
        ).encode()
        req = urllib.request.Request(
            f"{self.base_url}/realms/master/protocol/openid-connect/token", data=form
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                self.token = json.load(resp)["access_token"]
        except urllib.error.HTTPError as exc:
            raise RealmInitError(f"admin sign-in failed: {exc.code}") from exc

    @property
    def _realm_path(self) -> str:
        return f"/admin/realms/{self.realm}"

    def get_realm(self) -> dict:
        return self.request("GET", self._realm_path)

    def update_realm(self, realm: dict) -> None:
        self.request("PUT", self._realm_path, realm)

    def get_realm_version(self) -> int:
        raw = (self.get_realm().get("attributes") or {}).get(VERSION_ATTRIBUTE)
        if raw in (None, ""):
            return 0
        try:
            return int(raw)
        except (TypeError, ValueError):
            logger.warning("Unparseable %s=%r, treating as 0", VERSION_ATTRIBUTE, raw)
            return 0

    def set_realm_version(self, version: int) -> None:
        # Change the full representation we read, never a partial one: a partial PUT would drop
        # settings made in the console.
        realm = self.get_realm()
        realm["attributes"] = {**(realm.get("attributes") or {}), VERSION_ATTRIBUTE: str(version)}
        self.update_realm(realm)
        logger.info("Realm migration version is now %s", version)

    def find_client(self, client_id: str) -> dict | None:
        query = urllib.parse.urlencode({"clientId": client_id})
        found = self.request("GET", f"{self._realm_path}/clients?{query}")
        return found[0] if found else None

    def update_client(self, uuid: str, client: dict) -> None:
        self.request("PUT", f"{self._realm_path}/clients/{uuid}", client)

    def partial_import(self, payload: dict) -> dict:
        return self.request("POST", f"{self._realm_path}/partialImport", payload)

    def list_users(self) -> list[dict]:
        return self.request("GET", f"{self._realm_path}/users?max=1000")


def substitute_placeholders(raw: str, env) -> str:
    """Fill ${RELAY_*} placeholders. The admin API does not do this itself, unlike an import at
    start-up. Values are JSON-escaped; an unset placeholder is an error."""

    def fill(match):
        name = match.group(1)
        if name not in env:
            raise RealmInitError(f"realm JSON uses ${{{name}}} but it is not set")
        return json.dumps(env[name])[1:-1]

    return _PLACEHOLDER.sub(fill, raw)


def load_realm_definition(path: str, env) -> dict:
    with open(path, encoding="utf-8") as handle:
        return json.loads(substitute_placeholders(handle.read(), env))


def build_import_payload(definition: dict) -> dict | None:
    """Partial import body: allowed collections only, existing resources skipped."""
    payload = {"ifResourceExists": "SKIP"}
    for name in IMPORT_COLLECTIONS:
        if definition.get(name):
            payload[name] = definition[name]
    return payload if len(payload) > 1 else None


def refresh_clients(admin: Admin, definition: dict) -> None:
    """Re-apply the values of each client that depend on the local setup (they change with the
    web and API ports, and the secret) because skip-if-exists would freeze them at first import."""
    for wanted in definition.get("clients") or []:
        existing = admin.find_client(wanted["clientId"])
        if existing is None:
            logger.info("Client %s not found yet, partial import will create it", wanted["clientId"])
            continue
        updated = dict(existing)
        for key in ("redirectUris", "webOrigins", "secret"):
            if key in wanted:
                updated[key] = wanted[key]
        logout = (wanted.get("attributes") or {}).get("post.logout.redirect.uris")
        if logout is not None:
            updated["attributes"] = {
                **(existing.get("attributes") or {}),
                "post.logout.redirect.uris": logout,
            }
        if updated != existing:
            admin.update_client(existing["id"], updated)
            logger.info("Updated client %s", wanted["clientId"])


def refresh_smtp(admin: Admin, definition: dict) -> None:
    wanted = definition.get("smtpServer")
    if not wanted:
        return
    realm = admin.get_realm()
    merged = {**(realm.get("smtpServer") or {}), **wanted}
    if merged != realm.get("smtpServer"):
        realm["smtpServer"] = merged
        admin.update_realm(realm)
        logger.info("Updated realm SMTP settings")


def apply_realm(admin: Admin, definition: dict) -> None:
    refresh_clients(admin, definition)
    refresh_smtp(admin, definition)
    payload = build_import_payload(definition)
    if payload is None:
        logger.info("Nothing to partial-import")
        return
    names = ", ".join(k for k in payload if k != "ifResourceExists")
    logger.info("Applying partial import for: %s", names)
    result = admin.partial_import(payload) or {}
    logger.info(
        "Partial import: %s added, %s skipped, %s overwritten",
        result.get("added", 0),
        result.get("skipped", 0),
        result.get("overwritten", 0),
    )


def wait_for_keycloak(base_url: str, realm: str, attempts: int = 120, delay: float = 5) -> None:
    url = f"{base_url.rstrip('/')}/realms/{realm}"
    for i in range(1, attempts + 1):
        try:
            with urllib.request.urlopen(url, timeout=10) as resp:
                if resp.status == 200:
                    logger.info("Keycloak is up")
                    return
        except OSError:
            pass
        logger.info("Waiting for Keycloak (%s/%s)", i, attempts)
        time.sleep(delay)
    raise RealmInitError("Keycloak did not become ready")


def connect() -> Admin:
    env = os.environ
    base_url = env.get("KEYCLOAK_URL", "http://localhost:8080")
    realm = env.get("KEYCLOAK_REALM", "ehds-relay")
    wait_for_keycloak(base_url, realm)
    admin = Admin(base_url, realm)
    admin.login(env["KC_BOOTSTRAP_ADMIN_USERNAME"], env["KC_BOOTSTRAP_ADMIN_PASSWORD"])
    return admin


def run() -> None:
    from migrations import run_migrations

    admin = connect()
    definition = load_realm_definition(
        os.environ.get("REALM_FILE", "/realm-config/ehds-relay-realm.json"), os.environ
    )
    apply_realm(admin, definition)
    run_migrations(admin)
    logger.info("Realm-init finished")


def status() -> None:
    admin = connect()
    users = {u["username"]: u["id"] for u in admin.list_users()}
    print(json.dumps({"version": admin.get_realm_version(), "users": users}))


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    try:
        if "--status" in sys.argv:
            status()
        else:
            run()
            # Stay up so the Deployment is not restarted; a change to the chart restarts it.
            while True:
                time.sleep(3600)
    except RealmInitError as exc:
        logger.error("%s", exc)
        sys.exit(1)
