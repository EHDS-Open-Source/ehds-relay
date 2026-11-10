VERSION = 2
DESCRIPTION = "password policy and an explicit 5-minute lifetime for email links"

# Copied from the realm JSON on purpose: a shipped migration must keep doing what it did, even if
# the JSON changes later (that change would get its own migration).
PASSWORD_POLICY = (
    "length(12) and upperCase(1) and lowerCase(1) and digits(1) and specialChars(1)"
    " and notUsername and notEmail and maxLength(128)"
)
# Seconds a link sent by email (reset password, verify email) stays valid. Keycloak's default,
# stated so the repo says what users get.
ACTION_TOKEN_LIFESPAN_SECONDS = 300

SETTINGS = {
    "passwordPolicy": PASSWORD_POLICY,
    "actionTokenGeneratedByUserLifespan": ACTION_TOKEN_LIFESPAN_SECONDS,
}


def migrate(admin):
    """Set the password policy and link lifetime on an existing realm.

    Existing passwords keep working; the policy applies the next time a password is set.
    Changes the full realm representation, so console edits to other settings survive.
    """
    realm = admin.get_realm()
    if all(realm.get(key) == value for key, value in SETTINGS.items()):
        return
    realm.update(SETTINGS)
    admin.update_realm(realm)
