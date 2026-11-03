# Handover: integration branch

Temporary file for picking up this work; it is not part of any pull request and should be deleted when
the integration branch is retired.

## What this branch is
`mvp-integration` holds everything built so far, merged together and tested as one. It has no pull
request. The work is split into pull requests against `main`; the human merges them.

## Where things stand
**Open pull requests** (merge in this order; each description says which earlier ones it includes, and
its diff shrinks as they land):
1. #2 to #7: API CI, API route stubs, frontend workspace, UI CI, generated API client, app shell.
2. #8 dev environment (Keycloak, Mailpit, worker, web), #9 sign-in with a session cookie,
   #10 organisations, roles and members, #11 dataset metadata to Turtle, #12 JSON-LD and RDF/XML,
   #13 invitations with email, #14 dataset permissions, publish rules and row-level security.
   If #14 merges before #13, its migration must be re-pointed to follow the invitation migrations.

**Built and browser-checked, but with no pull request yet** (each has its own branch and a
`HANDOVER.md` on it; they were cut from this branch, so open their pull requests after #8 to #14 merge
and the diffs are small): sign-in and organisation picker, catalogue with search and filter, dataset
form, dataset record/edit/export pages.

**Not built:** the real export route with validation and catalogue export (deliberately deferred until
after the UI); the invitation page in the web app; the dataset revalidation reminder email.

## Check it works
- `make check` is clean. `make test`: backend 274 passed, frontend 188 passed (before this file).
- A real headless-browser walk-through passed every step on the kind cluster: sign in through Keycloak,
  create an organisation, save a draft, "Not ready to publish" list, full publish, catalogue search and
  filters, record, edit, delete with confirmation, and the Standard user not seeing Delete.

## Run it locally
```
make cluster up        # kind cluster "ehds-relay" (only ever this context)
tilt up                # api, keycloak, mailpit, worker, postgres, web
```
Web app http://localhost:5173, API http://localhost:8000, Keycloak http://localhost:8080,
Mailpit http://localhost:8025.

Dev-only logins (from the realm file in `deploy/helm/ehds-relay/files/`): `owner` / `owner`,
`standard` / `standard`, `invitee` / `invitee` (addresses `@example.org`). Keycloak console:
`admin` / `admin`. "Create one" on the sign-in page registers a new user; the verification email
arrives in Mailpit. `tilt down` removes the dev database, so seeded data is lost.

## Known issues and follow-ups
- Restarting Keycloak re-imports the realm with new user ids, so the API creates a second user with no
  organisations. Fix is to run the realm like the federated node does (persistent data, idempotent
  account creation, partial import, ordered migrations); it is tracked in the team vault.
- The invitation email links to `/invitations/<token>`, but the web app has no route for it yet.
- On an edit conflict the edit page shows two messages (the editor's banner and the form's line).
- The production build warns the bundle is about 640 kB; lazy-loading the dataset pages would fix it.
- Individual merge commits on this branch are not guaranteed to build on their own, only the tip.
- Declare the licence (AGPL-3.0, now in `LICENSE`) in `backend/pyproject.toml`, the `package.json`
  files and the README.

## Rules
Only ever deploy to the `kind-ehds-relay` context. Nobody merges to `main` without the owner. Remove a
branch's `HANDOVER.md` before opening its pull request. Rebuild the API client (`make api_client`)
after merging anything that changes the API.
