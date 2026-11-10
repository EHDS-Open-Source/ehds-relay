# Handover: password set, reset and change through Keycloak

## Status
Code complete; `make check` passes; fast tests for the touched areas pass. The live end-to-end
check has not been run yet (the Tilt port-forwards were not up from this checkout, and the
shared cluster runs another branch).

## Done
- Realm JSON: password policy (12-128 chars, upper, lower, digit, special, not username/email),
  explicit 300 s email-link lifetime, client `baseUrl` = `${RELAY_WEB_URL}/`.
- Dev test passwords changed to meet the policy (`Owner-pass-1!`, `Standard-pass-1!`,
  `Invitee-pass-1!`); README table and Tiltfile comment updated.
- Realm migration `m002_password_settings.py` sets policy and lifetime on existing realms;
  realm-init's client refresh now also sets `baseUrl`.
- API: `GET /api/v1/auth/login?action=change_password` adds `kc_action=UPDATE_PASSWORD` and
  `prompt=login` (422 with `signup`); the callback turns `kc_action_status` into
  `?password=success|cancelled|error` on the redirect. API client regenerated.
- Web: "Password" section on `/account` with a "Change password" link and result message;
  forgot-password hint under the card on `/sign-in`.
- `scripts/check_password_flows.py` + `make check_password_flows`; README "Passwords" section.
- Tests: `backend/tests/test_realm_init.py` (realm JSON flags, policy, dev passwords meet it,
  m002 idempotent, baseUrl refresh), `backend/tests/test_session.py` (action and status),
  `AccountPage.test.tsx`, `routes.test.tsx`, `login.test.ts`.

## Next
1. Full test run: `make test`.
2. With the stack up from this branch (`make tilt`, web on WEB_PORT):
   `make check_password_flows` (optionally `ARGS=--check-expiry`, waits about 5 minutes).
   The script's Keycloak form handling was written from Keycloak 26's default theme and not yet
   run live; adjust selectors if a step fails.
3. Existing realm: after Tilt redeploys realm-init, its log should say "Applying realm
   migration 2", a restart should say "up to date", and `scripts/check-keycloak-restart.sh`
   should pass.
4. By hand: reset link opened in a private window shows "Back to application"; change
   password from `/account` asks for the current password.

## Notes
- An existing dev realm keeps the old test passwords (password = username): users are never
  overwritten, and the policy only applies when a password is next set. Start over (delete
  the Postgres volume) to get the new ones.
- Realm-JSON checks live in `test_realm_init.py` (reusing its loader) rather than a new file.
