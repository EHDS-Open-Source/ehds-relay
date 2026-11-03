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

**UI pull requests** (open; cut from this branch, so they contain the work of #8 to #14 until those
merge): #16 sign-in and organisation picker, #17 catalogue with search and filter, #18 dataset form,
#19 dataset record, edit and export pages. They share a few files (messages, routes, `ui` exports, the
lockfile and generated API files): merge them one at a time and regenerate the client and lockfile
instead of hand-merging. On those branches the edit page is not yet wired to the form; this branch
holds the reconciled, tested result.

**Also built and merged here** (pull requests #21 to #24 are open):
- **Export and validation** (#21): the three export routes (`GET .../datasets/{id}/export?format=ttl|jsonld|rdfxml`,
  `POST .../datasets/{id}/validate`, `GET .../catalogue/export?format=`) are real, with offline checks against the
  vendored official Health DCAT-AP release 8 shapes in `backend/relay/rdf/shapes/` (its README gives the source,
  checksums and the one edit). The dataset output page shows the result as a panel. Needs the `pyshacl`
  dependency: run `make -C backend install` after pulling.
- **Members and invitations** (#22): the Members page for owners and the public `/invitations/<token>` accept page.
- **Organisation settings screen:** owners edit the organisation's name and country; the new values show in the
  header, menu and picker without signing out. Pull request #24.
- **Account page:** "Manage my account" opens `/account` (name editable, email read-only, sign out).
  `PATCH /api/v1/me` is real and a migration (`0008`) remembers that a user set their own name, so the sign-in
  callback no longer overwrites it. Pull request #23.

**Not built:** the dataset revalidation reminder (email, date and overdue flag), notification settings, password
reset checks, and the other follow-ups listed in the team vault.

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
