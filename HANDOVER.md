# Handover: sign-in and organisation picker (frontend)

Status: code finished, checks and tests pass. Left: a manual browser check against the running stack.

Done
- Real session store (`web/src/session/`) loading `/me` and `/organisations`; the demo stub is only in `session/testing.ts`.
- `/sign-in` page with "Sign in", "Create one" and the sign-in failed message.
- `/orgs` forwards for 0 or 1 organisations; the picker lists several with name and country.
- `/orgs/new` form (name, country with Greece as `EL` and Other as `XX`), reloads the session and opens the catalogue.
- Sign-out in the menu and on the picker and create screens; "Switch organisation" only with 2 or more organisations.
- A 401 from any API call while signed in goes to `/sign-in?redirect=<page>`.
- New `ui` pieces: `Input`, `Label`, `NativeSelect`, `FormMessage`.

Next
- Manual check in Tilt: sign in as owner@example.org, create an organisation, land in the catalogue, sign out, see the Keycloak form again.

Blockers: none.
