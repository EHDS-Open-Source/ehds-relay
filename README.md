# EHDS Relay

Proof of concept: FastAPI + PostgreSQL backend, run on a local kind cluster with Tilt, and a
React + Vite frontend.

Not here yet: background worker, gateway.

## Layout

| Path | What |
|---|---|
| `backend/` | Python package `relay` (FastAPI routers in `api/`, request/response DTOs in `dtos/`, SQLAlchemy models in `domain/`, Alembic migrations) and tests |
| `frontend/` | pnpm workspace: `packages/web` (Vite + React app), `packages/ui` (shared shadcn/ui components and theme), `packages/api-client` (typed API client) |
| `deploy/helm/ehds-relay/` | Umbrella Helm chart: API + `groundhog2k/postgres` subchart (`postgres.enabled`) |
| `.kind/`, `scripts/cluster.sh` | Local kind cluster `ehds-relay` and the shared local registries |
| `Tiltfile` | Dev loop: renders the chart, builds the image, live-syncs code |

## Prerequisites

docker, kind, kubectl, helm, tilt, Python 3.13, Node 24 and pnpm (`corepack enable`; version
pinned in `frontend/package.json`).

## Quickstart

```bash
make cluster up          # kind cluster "ehds-relay" + registries on localhost:5001-5003
tilt up                  # deploy postgres + api, live reload
```

- API: http://localhost:8000 (OpenAPI docs at `/docs`)
- Postgres: `localhost:5432`, database `relay`, user/password `relay`/`relay`

Tilt and the scripts only ever target the `kind-ehds-relay` context. Settings (cluster
name, namespace, release name, local ports) are in `.dev.env`, created from
`.dev.env.example` on first run.

Without Tilt: `make deploy` builds and pushes the image and runs `helm upgrade --install`.

Tear down: `make cluster down` (add `--remove-registries` to also remove the registries,
which other kind clusters on the machine may share).

## Backend

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
  (`&signup=true` opens its registration page). `redirect` must be a path on the site;
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
other out. Give each one its own cookie name, e.g. `RELAY_SESSION_COOKIE_NAME=relay_session_b`
in that checkout's `backend/.env` (and its own `WEB_PORT` / `RELAY_WEB_URL`).

Tests never contact the provider: `backend/tests/fake_oidc.py` stands in for it in the
sign-in flow tests, and the other tests insert a session row and set the cookie (see the
`client` and `sign_in` fixtures in `backend/tests/conftest.py`).

## API

| Method | Path | |
|---|---|---|
| GET | `/healthz` | liveness |
| GET | `/readyz` | readiness (checks the database) |
| POST | `/api/v1/organisations` | create `{"name": "Acme", "country": "NL"}` |
| GET | `/api/v1/organisations` | list |
| GET | `/api/v1/organisations/{id}` | get |
