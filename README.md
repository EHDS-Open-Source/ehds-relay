# EHDS Relay

EHDS Relay helps health data holders describe their datasets in Health DCAT-AP. Members of an
organisation fill in dataset records in a web form, save them as drafts, publish them to the
organisation's catalogue, download them as Turtle, JSON-LD or RDF/XML and check them against the
official SHACL shapes. Owners invite colleagues by email.

It is a proof of concept: a FastAPI + PostgreSQL backend and a React + Vite frontend, run on a
local kind cluster with Tilt. See "Demo walkthrough" below for a first tour.

## Layout

| Path | What |
|---|---|
| `backend/` | Python package `relay` (FastAPI routers in `api/`, request/response DTOs in `dtos/`, SQLAlchemy models in `domain/`, Alembic migrations) and tests |
| `frontend/` | pnpm workspace: `packages/web` (Vite + React app), `packages/ui` (shared shadcn/ui components and theme), `packages/api-client` (typed API client) |
| `deploy/helm/ehds-relay/` | Umbrella Helm chart: API, worker, Keycloak (realm in `files/`), Mailpit and the `groundhog2k/postgres` subchart; each has an `enabled` switch |
| `.kind/`, `scripts/cluster.sh` | Local kind cluster `ehds-relay` and the shared local registries |
| `Tiltfile` | Dev loop: renders the chart, builds the image, live-syncs code |

## Prerequisites

GNU make, docker (give it at least 4 GB of memory), kind, kubectl, helm, tilt, Python 3.13,
Node 24 and pnpm (version pinned in `frontend/package.json`; if pnpm is not installed,
`corepack enable` provides it). The first `tilt up` also needs network access to pull images and
the Postgres Helm chart.

## Quickstart

```bash
make install             # backend/.venv + frontend node_modules (for the checks and scripts)
make cluster up          # kind cluster "ehds-relay" + registries on localhost:5001-5003
tilt up                  # deploy everything below, with live reload
```

Wait until every resource in the Tilt UI (http://localhost:10350) is green, then open
http://localhost:5173. A new stack starts with an empty database: see "Demo walkthrough" below.

| Service | Where | Notes |
|---|---|---|
| API | http://localhost:8000 | OpenAPI docs at `/docs` |
| Web | http://localhost:5173 | Vite dev server on the host (hot module reload), proxies `/api` to the API |
| Worker | no port | Same image as the API, restarts on code change. Runs background jobs (Procrastinate), such as sending queued email |
| Keycloak | http://localhost:8080 | Admin console `admin`/`admin`; realm `ehds-relay`, client `ehds-relay-bff` |
| Mailpit | http://localhost:8025 (SMTP `localhost:1025`) | Catches mail from the worker and from Keycloak (sign-up verification, password reset) |
| Postgres | `localhost:5432` | Database `relay`, user/password `relay`/`relay` |

Keycloak test users in the `ehds-relay` realm (`<username>@example.org`):

| Username | Password |
|---|---|
| `owner` | `Owner-pass-1!` |
| `standard` | `Standard-pass-1!` |
| `invitee` | `Invitee-pass-1!` |

They are plain accounts: roles and organisation membership live in the app database. A realm
created before the password policy was added keeps the old passwords (password = username)
until you start over (see below); the policy only applies when a password is next set. All credentials here, including the BFF client secret,
are throwaway values for local development only.

Keycloak runs in dev mode with its data in a separate `keycloak` database on the bundled
Postgres, so it shares the Postgres volume with the app data. The realm in
`deploy/helm/ehds-relay/files/ehds-relay-realm.json` is imported once, when the realm does not
exist. The test users have fixed ids in that file, so their sign-in subject stays the same even
if Keycloak's database is recreated. Restarting Keycloak, or `tilt down` and `tilt up`, keeps
users, including ones you register. To start over, delete the Postgres volume (this also
deletes the app data): `kubectl --context kind-ehds-relay -n ehds-relay delete pvc --all`
after `tilt down`, with your `NAMESPACE` from `.dev.env` in place of `ehds-relay` if you changed
it. With `postgres.enabled=false` Keycloak falls back to in-pod storage and
forgets everything on restart.

The `keycloak-realm-init` job runs after Keycloak starts and whenever the realm file or its
script changes. It refreshes the BFF client's redirect URIs and secret and the realm's SMTP
settings from the current ports, adds clients, roles, groups and users that are in the realm
file but missing from the realm (existing ones are never overwritten, and realm-level settings
are never replayed), then runs the migrations. The migration version is kept in the realm
attribute `relay_realm_version`, and the job's log shows `at version X, target Y`.

Changing a realm-level setting or an existing client or user:
1. Make the change in the realm JSON, so fresh realms get it.
2. Add a migration so existing realms get it too: a file
   `deploy/helm/ehds-relay/files/realm-init/migrations/mNNN_short_name.py` with `VERSION` (one
   more than the highest), `DESCRIPTION` and `migrate(admin)`. It is found automatically and runs
   once. Never edit a migration that has shipped; keep each one idempotent. See the docstring in
   `migrations/__init__.py`.

`scripts/check-keycloak-restart.sh` deletes the Keycloak pod and checks that user ids and the
migration version are unchanged and that no email has two `app_user` rows.

Warnings: the API identifies a user by issuer and subject, and the issuer includes the Keycloak
port. Changing `KEYCLOAK_LOCAL_PORT` therefore makes every user a new one. The first start after
upgrading from the in-memory Keycloak gives the owner one new `app_user` (the old subject no
longer exists); sign in once and re-invite, or reset the database, to avoid the duplicate.

Tilt and the scripts only ever target the `kind-ehds-relay` context. Settings (cluster
name, namespace, release name, session cookie name, local ports) are in `.dev.env`, created from
`.dev.env.example` on first run. Every local port can be changed there so several checkouts
run side by side; Keycloak's issuer and redirect URLs follow the web, API and Keycloak ports.

A second checkout in the same cluster needs more than new ports: with the same namespace and
release name its `tilt up` would deploy over the first checkout's stack. Give it its own
namespace, release name and cookie name too, for example this `.dev.env`:

```bash
CLUSTER_NAME=ehds-relay
NAMESPACE=ehds-relay-b
RELEASE_NAME=ehds-relay-b
RELAY_SESSION_COOKIE_NAME=relay_session_b
API_LOCAL_PORT=8100
POSTGRES_LOCAL_PORT=5532
KEYCLOAK_LOCAL_PORT=8180
MAILPIT_UI_LOCAL_PORT=8125
MAILPIT_SMTP_LOCAL_PORT=1125
WEB_PORT=5273
```

Then run `make cluster up` (it reuses the cluster and creates the namespace) and
`tilt up --port 10351`, since the first Tilt's UI already uses port 10350. Stop it with
`tilt down` from the same checkout; the namespace stays until you delete it with
`kubectl --context kind-ehds-relay delete namespace ehds-relay-b`.

Keycloak tokens carry the browser-facing issuer (`http://localhost:8080/realms/ehds-relay`),
while the API reaches Keycloak at its in-cluster address (`RELAY_OIDC_INTERNAL_URL`). Open
Keycloak in a browser at `localhost`, not at another hostname, or the issuer will not match.
Keycloak 26 marks its login cookies `Secure` even over http. Chrome and Firefox accept that on
`http://localhost`; Safari may not, so use another browser for sign-in there.

Without Tilt: `make deploy` builds and pushes the image and runs `helm upgrade --install`.

Tear down: `make cluster down` (add `--remove-registries` to also remove the registries,
which other kind clusters on the machine may share). This deletes the whole cluster, including
every checkout's stack in it.

## Demo walkthrough

With the stack running (ports below are the defaults):

1. Open http://localhost:5173 and sign in as `owner`. A new database has no organisations, so
   you land on "Create my organisation". Enter a name and country.
2. Open the menu, choose "Manage users" and invite `invitee@example.org` with "Invite user".
3. Within about 10 seconds the worker sends the invitation. Open it in Mailpit
   (http://localhost:8025) and follow the link in another browser profile or a private window.
   Sign in there as `invitee` and accept the invitation.
4. Back as `owner`, choose "Add a dataset", fill in the form and use "Save changes" > "Save
   draft". "Save and Publish" lists any fields still missing; once the record is complete it is
   published.
5. In the catalogue, search for a word from the title and try the access-level filters.
6. On the dataset, "View output" shows the record as Turtle, JSON-LD and RDF/XML, each with a
   download button, and "Official checks" runs the SHACL validation.
7. The whole published catalogue is available from the API only:
   `/api/v1/organisations/{id}/catalogue/export?format=ttl` (or `jsonld`, `rdfxml`), opened in
   the signed-in browser.

As `invitee` (a Standard member) you can view and edit datasets but not manage users. The
`standard` user is not a member of any organisation until someone invites it.

`make check_password_flows` checks registration, password change and reset against the running
stack (see "Passwords" below).

## Checks and tests

```bash
make install             # backend/.venv + frontend node_modules
make test                # pytest (throwaway Postgres via testcontainers, needs docker) + vitest
make check               # ruff + pyright, eslint + prettier + tsc
```

Dependencies are declared in `backend/pyproject.toml` and locked with pip-compile into
hashed `requirements.txt` / `requirements-dev.txt`:

```bash
make pip_compile pip_compile_dev
```

Migrations run automatically in the API pod's init container. To add one:

```bash
cd backend && .venv/bin/alembic revision -m "describe change"
```

## Frontend

```bash
make install             # also runs pnpm install in frontend/
make web                 # Vite dev server on http://localhost:5173
make api_client          # after changing routes or DTOs: regenerate the typed API client
```

The dev server proxies `/api`, `/healthz` and `/readyz` to the API on
`localhost:${API_LOCAL_PORT:-8000}` (e.g. the Tilt port-forward). Set `WEB_PORT` to run it
on another port. More in `frontend/README.md`.

## Signing in

The API is the browser's backend for OpenID Connect (Keycloak in development). It runs the
authorisation-code flow with PKCE, keeps the session in Postgres and gives the browser only an
opaque HttpOnly cookie. The browser always talks to the API through the web app's origin (the
Vite proxy), so the cookie belongs to that origin.

- `GET /api/v1/auth/login?redirect=/orgs` sends the browser to the provider
  (`&signup=true` opens its registration page, `&action=change_password` its change-password
  page, see "Passwords" below). `redirect` must be a path on the site;
  anything else becomes `/`.
- The provider returns to `GET /api/v1/auth/callback`, which creates or updates the user,
  sets the session cookie and redirects to `redirect`. If anything goes wrong it redirects to
  `/sign-in?error=signin_failed` and logs the reason.
- `POST /api/v1/auth/logout` ends the session and returns `{"redirect_url": ...}`: the
  provider's sign-out page, which ends its own session too and then returns to `/sign-in`.
  Navigate the browser there.
- Every other `/api/v1` route needs the session (401 without it), except the invitation
  preview and `/capabilities`. Every POST, PUT, PATCH and DELETE under `/api/` must send
  the header `X-Requested-By: ehds-relay` (403 without it).

Settings (environment variables, or `backend/.env` when running the API on the host):

| Variable | Default | |
|---|---|---|
| `RELAY_OIDC_ISSUER_URL` | `http://localhost:8080/realms/ehds-relay` | issuer as browsers see it |
| `RELAY_OIDC_INTERNAL_URL` | issuer URL | where the API reaches the provider, if different |
| `RELAY_OIDC_CLIENT_ID` | `ehds-relay-bff` | |
| `RELAY_OIDC_CLIENT_SECRET` | none | required for sign-in |
| `RELAY_WEB_URL` | `http://localhost:5173` | the web app's origin; the provider redirects back here |
| `RELAY_SESSION_COOKIE_NAME` | `relay_session` | |
| `RELAY_SESSION_IDLE_MINUTES` / `RELAY_SESSION_MAX_HOURS` | `60` / `12` | idle and absolute session lifetime |

To sign in during development, open
`http://localhost:5173/api/v1/auth/login?redirect=/` and use one of the realm's test users.

Cookies on `localhost` ignore the port, so two checkouts running side by side would sign each
other out. Give each one its own cookie name, e.g. `RELAY_SESSION_COOKIE_NAME=relay_session_b`:
in that checkout's `.dev.env` for a Tilt stack, or in its `backend/.env` (with its own
`WEB_PORT` / `RELAY_WEB_URL`) for an API run on the host.

Tests never contact the provider: `backend/tests/fake_oidc.py` stands in for it in the
sign-in flow tests, and the other tests insert a session row and set the cookie (see the
`client` and `sign_in` fixtures in `backend/tests/conftest.py`).

The API client in `frontend/packages/api-client` is generated from the backend's OpenAPI spec
(`python -m relay.openapi`, which needs no database). Commit the regenerated spec and client
with the API change.

### Passwords

Keycloak handles passwords; the app has no password code of its own, only links into Keycloak.

- **Set a password (new account):** "Create one" on `/sign-in` opens Keycloak's registration
  page (name and address only). Keycloak emails a link to verify the address; the link leads to a
  page where the user chooses a password (checked against the policy), then signs them in. This
  is Keycloak 26's behaviour when email verification is on.
- **Forgotten password:** "Forgot Password?" on Keycloak's sign-in page (the app's `/sign-in`
  says so). Keycloak shows the same answer whether or not the address has an account and only
  emails a registered one. The link sets a new password and works once.
- **Change password:** the "Change password" link on `/account` goes to
  `GET /api/v1/auth/login?action=change_password&redirect=/account`. Keycloak asks for the
  current password, then the new one, and the API sends the browser back to
  `/account?password=success` (or `cancelled` / `error`), which the page reports.

The dev realm's password policy: at least 12 and at most 128 characters, with an upper-case
letter, a lower-case letter, a digit and a special character, and not the username or email.
Keycloak only shows the rules after a refused attempt. Links sent by email (verification and
reset) are valid for 5 minutes (`actionTokenGeneratedByUserLifespan`). In development the
emails land in Mailpit.

These are realm-level settings: they are in the realm JSON for new realms and in the realm
migration `m002_password_settings.py` for existing ones (see "Changing a realm-level setting"
above). The client's base URL (`RELAY_WEB_URL`), used for Keycloak's "Back to application"
link, is refreshed on every realm-init start.

`make check_password_flows` runs all three flows against the running stack (`make tilt`): it
registers a new random user, reads the emails from Mailpit, changes and resets the password,
and checks the realm settings. It is not part of `make test`. Add `ARGS=--check-expiry` to also
wait for a reset link to expire.

## Email in development

The API never talks to a mail server. It writes each email to the `email_outbox` table in the
same transaction as the change it reports (for example, a new invitation), so an email is sent
only if that change was saved. The worker (`python -m relay.worker`) checks the outbox every
10 seconds, sends due emails over SMTP and clears their bodies once sent. A failed send is
retried with a growing delay, up to `RELAY_EMAIL_MAX_ATTEMPTS` (default 5) attempts; the error
is kept in `last_error`.

In Tilt the worker sends to Mailpit: open http://localhost:8025 (`MAILPIT_UI_LOCAL_PORT`) to
read what was sent. Settings: `RELAY_SMTP_HOST`, `RELAY_SMTP_PORT`, `RELAY_SMTP_FROM`.

The worker's job queue (Procrastinate) keeps its tables in the same database; the Alembic
migrations create them. At start-up the worker waits up to five minutes for them (the API
pod's init container runs the migrations), then exits so it is restarted.

Every 5 minutes the worker also queues revalidation reminders: for each published dataset whose
reminder date is today or earlier and not yet sent, one email per Owner and per member who set
the reminder (unless they switched the reminder off). To try it in Tilt, set a reminder date in
the past on a published dataset and watch Mailpit; later runs send nothing more.

Invitation links have the form `{RELAY_WEB_URL}/invitations/{token}` and stay valid for
`RELAY_INVITATION_TTL_DAYS` (default 30) days.

## End-to-end tests

Playwright specs in `frontend/e2e/` drive the real app in Chromium: an owner signs in through
Keycloak's own page, creates an organisation, saves a draft dataset, sees what is missing,
publishes it and opens its output; a second user cannot open that organisation's dataset.
Each run creates its own organisation, so runs can repeat against the same database. They
are not part of `make test`.

Locally, against the running stack (`make tilt`, with the web app on `WEB_PORT`):

```bash
make install                                             # once
(cd frontend && pnpm exec playwright install chromium)   # once; add --with-deps for system libraries
make e2e                                                 # ARGS=--headed to watch, ARGS=--ui to step through
```

The specs sign in as the dev users above. If your realm still has older passwords, set
`E2E_OWNER_PASSWORD` and `E2E_STANDARD_PASSWORD` (and `E2E_OWNER_USER`, `E2E_STANDARD_USER`).
On a failure, the trace is in `frontend/e2e/test-results/`
(`pnpm exec playwright show-trace <path>` from `frontend/`).

In CI, `ci-e2e.yml` runs `scripts/e2e-stack.sh`, which creates a kind cluster on the runner,
builds and loads the API image, installs the Helm chart with the same browser-facing settings
as Tilt, port-forwards the API, Keycloak and Mailpit and waits until they are ready. It then
starts Vite and runs `make e2e`. A failed run uploads the Playwright report and traces as an
artifact and prints the pods' logs.

## API

| Method | Path | |
|---|---|---|
| GET | `/healthz` | liveness |
| GET | `/readyz` | readiness (checks the database) |
| POST | `/api/v1/organisations` | create `{"name": "Acme", "country": "NL"}` |
| GET | `/api/v1/organisations` | list |
| GET | `/api/v1/organisations/{id}` | get |
| GET | `/api/v1/organisations/{id}/datasets/{dataset_id}/export?format=ttl\|jsonld\|rdfxml` | Members: the Health DCAT-AP record as a file; 422 if the record is incomplete |
| POST | `/api/v1/organisations/{id}/datasets/{dataset_id}/validate` | Members: check against the official release 8 SHACL shapes for the access level (vendored in `backend/relay/rdf/shapes/`, no network) |
| GET | `/api/v1/organisations/{id}/catalogue/export?format=…` | Members: one `dcat:Catalog` of the published datasets |
| POST | `/api/v1/organisations/{id}/invitations` | Owners: invite `{"email": "a@example.org", "name": "Ann Example", "role": "standard"}` (`name` required, `role` defaults to `standard`); emails a link |
| GET | `/api/v1/organisations/{id}/invitations?status=pending` | Owners: list, newest first |
| DELETE | `/api/v1/organisations/{id}/invitations/{invitation_id}` | Owners: cancel a pending invitation |
| POST | `/api/v1/organisations/{id}/invitations/{invitation_id}/resend` | Owners: new link and expiry, old link stops working |
| GET | `/api/v1/invitations/{token}` | public preview of an invitation |
| POST | `/api/v1/invitations/{token}/accept` | join as the signed-in user, whose email must be the invited one |
