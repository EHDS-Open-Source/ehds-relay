VERSION = 1
DESCRIPTION = "baseline: records the version; the realm JSON already holds this configuration"


def migrate(admin):
    """Nothing to change. Realms start at version 0, and this marks them as the baseline."""
