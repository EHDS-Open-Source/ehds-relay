# Handover: integration branch

Temporary file for picking up this work. Delete it when the integration branch is retired.

## What this branch is
`mvp-integration` holds everything built so far, merged together and tested as one. The work is also
split into small pull requests against `main` (below); the human merges them. Draft pull request #20
is this whole branch; it also carries the glue that no smaller pull request has (the edit page wired to
the dataset form, the shared field map and query keys, and the chart settings for the web address and
session), so keep it in mind when merging the others.

## Pull requests
**Already merged to `main`:** the first skeleton, #15 (licence), #25 (README holding text) and
#26 (contributing guide, code of conduct, security and support policies, GitHub templates).

**Open, merge in this order** (each description says which earlier ones it includes; the diff shrinks as
they land; they share a few files, so merge one at a time and regenerate the API client and lockfile
rather than hand-merging):
1. #2 to #7: API CI, API route stubs, frontend workspace, UI CI, generated API client, app shell.
2. #8 dev environment (Keycloak, Mailpit, worker, web), #9 sign-in with a session cookie, #10 organisations,
   roles and members, #11 dataset metadata to Turtle, #12 JSON-LD and RDF/XML, #13 invitations with email,
   #14 dataset permissions, publish rules and row-level security.
3. #16 sign-in and organisation picker, #17 catalogue with search and filter, #18 dataset form,
   #19 dataset record, edit and export pages.
4. #21 SHACL validation, export and catalogue export, #22 members, invitations and the accept page,
   #23 account page and changing your name, #24 organisation settings screen, #27 revalidation reminder date
   and overdue flag, #28 notification settings and organisations on the account page.

**Migrations** must stay one chain: `0003` users and sessions, `0004` membership, `0005` invitations and email
outbox, `0006` job queue, `0007` dataset row-level security, `0008` the account name flag, `0009` the
reminder date, `0010` notification settings. If you merge out of order, re-point `down_revision` (and the
docstring `Revises:` line) so `alembic heads` shows a single head. After merging anything that changes the
API, run `make api_client`. After pulling, run `make -C backend install` (new dependencies: `pyshacl`,
`procrastinate`, `rdflib`, `authlib`).

## What works (tested together on this branch)
- `make check` clean; backend `make test` 363 passed; frontend 260 passed.
- A headless-browser walk-through passed on the kind cluster: sign in through Keycloak, create an
  organisation, save a draft, the "Not ready to publish" list, a full publish, catalogue search and filters,
  record, edit, delete with confirmation, and the Standard user not seeing Delete.
- Export in Turtle, JSON-LD and RDF/XML, checked offline against the vendored official Health DCAT-AP release 8
  shapes in `backend/relay/rdf/shapes/` (its README has the source, checksums and the one edit). Catalogue
  export works too. The web app shows the validation result on the output page; there is no catalogue export
  button yet.
- Members page, invitations and the public `/invitations/<token>` accept page; account page; organisation
  settings; reminder date and overdue flag; notification settings.

## Not built yet
The revalidation reminder email itself (the date, the overdue flag and the helpers exist), the Revalidate
action, an audit log and "last changed by", welcome and member-added emails, a self-hosting Helm chart,
rolling frontend versions, an accessibility pass, admin and self-hosting docs, and keeping dev sign-in users
stable across Keycloak restarts. These are tracked in the team vault.

## Run it locally
```
make cluster up        # kind cluster "ehds-relay" (only ever this context)
tilt up                # api, keycloak, mailpit, worker, postgres, web
```
Web app http://localhost:5173, API http://localhost:8000, Keycloak http://localhost:8080,
Mailpit http://localhost:8025.

Dev-only logins (from `deploy/helm/ehds-relay/files/ehds-relay-realm.json`): `owner` / `owner`,
`standard` / `standard`, `invitee` / `invitee` (addresses `@example.org`). Keycloak console: `admin` / `admin`.
"Create one" on the sign-in page registers a new user; the verification email arrives in Mailpit.

For a truly clean start: `tilt down` does not remove the Postgres volume; also run
`kubectl --context kind-ehds-relay -n ehds-relay delete pvc postgres-data-ehds-relay-dev-postgres-0`.
Do not restart Keycloak on its own while testing: it re-imports the realm with new user ids and the API
then sees a second user with no organisations. New migrations are not applied by Tilt's live update; run
`kubectl --context kind-ehds-relay -n ehds-relay exec deploy/ehds-relay-dev-api -- alembic upgrade head`.

## Waiting on a human
- Merge the pull requests in the order above, and decide what to do with draft pull request #20.
- Enable private vulnerability reporting in the repository settings (the security policy points at it) and
  confirm the contact address and response times copied from the federated node.
- Declare the licence (AGPL-3.0) in `backend/pyproject.toml`, the `package.json` files and the README, and
  decide between a CLA and a DCO sign-off.
- Edit the README status line ("backend skeleton only") once the big pull requests land.

## Known issues
- On an edit conflict the edit page shows two messages (the editor's banner and the form's line).
- The production build warns the bundle is about 640 kB; lazy-loading the dataset pages would fix it.
- Individual merge commits on this branch are not guaranteed to build on their own, only the tip.
- The header and menu do not show the signed-in user's name yet.

## Rules
Only ever deploy to the `kind-ehds-relay` context (this machine's kubeconfig also has cloud clusters). Nobody
merges to `main` without the owner. Remove a branch's `HANDOVER.md` before opening its pull request. Keep
ticket IDs, private document names and section numbers out of code, comments, commits and pull request text.
