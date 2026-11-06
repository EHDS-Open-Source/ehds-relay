"""Ordered, run-once realm migrations, discovered from this package.

Why this exists
---------------
The realm JSON is imported by Keycloak only when the realm does not exist yet. Realm-init also
applies it to an existing realm through partial import, but with "skip if exists", so that adds
new clients, roles, groups and users and never changes anything already there. Anything that must
change existing realm configuration (password policy, token lifetimes, required actions, an
existing client) goes in a migration.

Rule: a realm-level change goes in the realm JSON (for fresh realms) and in a new migration (for
existing ones). A migration must also work on a fresh realm, where the JSON already has the change.

Adding a migration
------------------
Add `mNNN_short_name.py` here, exporting:

    VERSION = 2                        # int, one more than the current highest
    DESCRIPTION = "what it does"       # shown in the realm-init log

    def migrate(admin):                # `admin` is realm_init.Admin
        ...

Discovery is automatic and ordered by VERSION. Modules whose name starts with `_` are ignored, so
they can hold shared helpers.

Contract
--------
- Append only. Never renumber, reorder or edit a migration that has shipped: realms that already
  ran it will not run it again.
- Make each migration idempotent anyway, in case it fails part-way and is retried.
- The version is stored per migration, so a failure keeps the earlier ones recorded.
"""

import importlib
import logging
import pkgutil
from types import ModuleType

logger = logging.getLogger("realm_migrations")


def discover(package: ModuleType) -> list[ModuleType]:
    """Import the migration modules of `package`, ordered by VERSION, and validate them.

    Two branches that each add "version 3" would merge cleanly and one would silently never run,
    so duplicates, gaps and incomplete modules are errors.
    """
    by_version: dict[int, ModuleType] = {}
    for found in pkgutil.iter_modules(package.__path__):
        if found.name.startswith("_"):
            continue
        module = importlib.import_module(f"{package.__name__}.{found.name}")
        for attr in ("VERSION", "DESCRIPTION", "migrate"):
            if not hasattr(module, attr):
                raise RuntimeError(f"migration module '{found.name}' does not define {attr}")
        if module.VERSION in by_version:
            raise RuntimeError(
                f"duplicate migration VERSION {module.VERSION}: "
                f"'{by_version[module.VERSION].__name__}' and '{module.__name__}'"
            )
        by_version[module.VERSION] = module

    versions = sorted(by_version)
    if versions != list(range(1, len(versions) + 1)):
        raise RuntimeError(f"migration VERSIONs must be contiguous and start at 1, got {versions}")
    return [by_version[v] for v in versions]


def run_migrations(admin, migrations: list[ModuleType] | None = None) -> None:
    """Apply every migration newer than the version stored on the realm."""
    if migrations is None:
        migrations = discover(importlib.import_module(__name__))
    current = admin.get_realm_version()
    target = migrations[-1].VERSION if migrations else 0

    # Always logged, so the log answers "did migrations apply?" without guesswork.
    logger.info("Realm migrations: at version %s, target %s", current, target)
    if current >= target:
        logger.info("Realm is up to date, no migrations to apply")
        return

    for module in migrations:
        if module.VERSION <= current:
            continue
        logger.info("Applying realm migration %s: %s", module.VERSION, module.DESCRIPTION)
        module.migrate(admin)
        # Per migration, not once at the end: a later failure keeps the earlier ones recorded.
        admin.set_realm_version(module.VERSION)

    logger.info("Realm migrations complete")
