VERSION = 3
DESCRIPTION = "EHDS Relay sign-in and email theme, and a 1-hour lifetime for email links"

# Copied from the realm JSON on purpose: a shipped migration must keep doing what it did, even if
# the JSON changes later (that change would get its own migration).
THEME = "ehds-relay"
# Seconds a link sent by email (reset password, verify email, account actions) stays valid.
# Keycloak's default of 5 minutes is short for email; the emails and pages say "1 hour".
ACTION_TOKEN_LIFESPAN_SECONDS = 3600

SETTINGS = {
    "loginTheme": THEME,
    "emailTheme": THEME,
    "actionTokenGeneratedByUserLifespan": ACTION_TOKEN_LIFESPAN_SECONDS,
}


def migrate(admin):
    """Select the relay theme for the sign-in pages and emails and lengthen the link lifetime.

    The account console and admin console keep Keycloak's own themes. Changes the full realm
    representation, so console edits to other settings survive.
    """
    realm = admin.get_realm()
    if all(realm.get(key) == value for key, value in SETTINGS.items()):
        return
    realm.update(SETTINGS)
    admin.update_realm(realm)
