# Handover: SHACL validation and catalogue export

Temporary file for picking up this branch; delete it before merging.

## This branch: member and invitation screens
Done: the Members page (owners only) lists members with role change and removal (with a confirmation),
and below it the invitations: invite form (email and role), status filter, date sent, resend, and cancel
(with a confirmation). Server answers (last owner, already a member, already invited, not pending, not
allowed) are shown as plain sentences. A new public page `/invitations/<token>` (the link in the
invitation email) shows the organisation, who invited you and the role; signed-out visitors get "Sign in"
and "Create an account" (back to the same link afterwards), signed-in ones get "Accept", after which the
organisation list is reloaded and its catalogue opens. Wrong account (403), unknown link (404) and
cancelled, expired or used invitations (410) each have their own message.
Notes: the server lets only owners list members, so a standard member sees a short "only owners manage
members" note and has no Members menu item. Frontend check, tests and build pass. Not yet done: a manual
browser run through invite, email, accept. The shared test setup (`vitest.setup.ts`) now also answers
member and invitation lists with an empty list.

## What this branch is
`mvp-integration` holds everything built so far, merged together and tested as one. It has no pull
request. The work is split into pull requests against `main`; the human merges them.

## Export and validation (merged here)
- Vendors the official Health DCAT-AP release 8 SHACL files in `backend/relay/rdf/shapes/`
  (README there: source URL, checksums, and the one edit needed for them to load).
- `backend/relay/rdf/validate.py` checks a dataset graph against the shape set for its access level
  (public, restricted, non-public), offline, and turns each result into a plain sentence tied to a
  form field.
- Routes in `backend/relay/api/export.py`:
  - `GET .../datasets/{id}/export?format=ttl|jsonld|rdfxml`: the record as a file (`Content-Type`
    per format, `Content-Disposition` with a file name made from the title). Incomplete records get
    422; a complete draft can be exported. Export does not run the checks.
  - `POST .../datasets/{id}/validate`: `{conforms, missing, violations[{path, field, message,
    severity}]}`. `field` is new (form field key, may be null).
  - `GET .../catalogue/export?format=`: one `dcat:Catalog` with the organisation's published datasets.
- The QUANTUM label (stored as Turtle) is merged into the dataset graph, so it appears in every export.
- Dataset IRIs are the record page URLs of the web app (`{web_url}/orgs/{org}/datasets/{id}`).

## Status
Done. The dataset output page shows an "Official checks" panel above the format tabs
(`frontend/packages/web/src/datasets/ValidationPanel.tsx`): "Passes the official checks", or a list
of problems, each linking to its field in the edit form. A 501 shows "not available yet".
`make check` clean; backend 308 tests and frontend 192 tests pass. `make api_client` is stable.

## Not done
- No catalogue export button in the web app yet (the route works).
- Not tried in Tilt or a browser; only automated tests.

## Things to know
- The public golden example is the Health DCAT-AP minimum. It passes the official checks, but the app
  requires more fields before publishing, so the export route refuses it with 422. Only the full
  golden example is exported over HTTP in tests; both are checked format by format in `test_rdf.py`.
- The shape files import the generic DCAT-AP 3.0.0 shapes and EU vocabularies over the network.
  Those imports are not followed, so only the Health DCAT-AP rules are checked.

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
- On an edit conflict the edit page shows two messages (the editor's banner and the form's line).
- The production build warns the bundle is about 640 kB; lazy-loading the dataset pages would fix it.
- Individual merge commits on this branch are not guaranteed to build on their own, only the tip.
- Declare the licence (AGPL-3.0, now in `LICENSE`) in `backend/pyproject.toml`, the `package.json`
  files and the README.

## Rules
Only ever deploy to the `kind-ehds-relay` context. Nobody merges to `main` without the owner. Remove a
branch's `HANDOVER.md` before opening its pull request. Rebuild the API client (`make api_client`)
after merging anything that changes the API.
## Check it
`make check`; `make -C backend test` (needs docker); `make -C frontend test`.
