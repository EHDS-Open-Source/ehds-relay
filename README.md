# EHDS Relay

Proof of concept: FastAPI + PostgreSQL backend, run on a local kind cluster with Tilt, and a
React + Vite frontend.

Not here yet: gateway. The worker is a placeholder and nothing signs in through Keycloak yet.

## Layout

| Path | What |
|---|---|
| `backend/` | Python package `relay` (FastAPI routers in `api/`, request/response DTOs in `dtos/`, SQLAlchemy models in `domain/`, Alembic migrations) and tests |
| `frontend/` | pnpm workspace: `packages/web` (Vite + React app), `packages/ui` (shared shadcn/ui components and theme), `packages/api-client` (typed API client) |
| `deploy/helm/ehds-relay/` | Umbrella Helm chart: API, worker, Keycloak (realm in `files/`), Mailpit and the `groundhog2k/postgres` subchart; each has an `enabled` switch |
| `.kind/`, `scripts/cluster.sh` | Local kind cluster `ehds-relay` and the shared local registries |
| `Tiltfile` | Dev loop: renders the chart, builds the image, live-syncs code |

## Prerequisites

docker, kind, kubectl, helm, tilt, Python 3.13, Node 24 and pnpm (`corepack enable`; version
pinned in `frontend/package.json`).

## Quickstart

```bash
make cluster up          # kind cluster "ehds-relay" + registries on localhost:5001-5003
tilt up                  # deploy everything below, with live reload
```

| Service | Where | Notes |
|---|---|---|
| API | http://localhost:8000 | OpenAPI docs at `/docs` |
| Web | http://localhost:5173 | Vite dev server on the host (hot module reload), proxies `/api` to the API |
| Worker | no port | Same image as the API, restarts on code change. A placeholder until the job queue lands |
| Keycloak | http://localhost:8080 | Admin console `admin`/`admin`; realm `ehds-relay`, client `ehds-relay-bff` |
| Mailpit | http://localhost:8025 (SMTP `localhost:1025`) | Catches mail from the worker and from Keycloak (sign-up verification, password reset) |
| Postgres | `localhost:5432` | Database `relay`, user/password `relay`/`relay` |

Keycloak test users in the `ehds-relay` realm (password = username): `owner`, `standard`
and `invitee` (`<username>@example.org`). They are plain accounts: roles and organisation
membership live in the app database. All credentials here, including the BFF client secret,
are throwaway values for local development only. Keycloak runs in dev mode and keeps nothing
between restarts; the realm is re-imported from
`deploy/helm/ehds-relay/files/ehds-relay-realm.json` every time it starts.

Tilt and the scripts only ever target the `kind-ehds-relay` context. Settings (cluster
name, namespace, release name, local ports) are in `.dev.env`, created from
`.dev.env.example` on first run. Every local port can be changed there so several checkouts
run side by side; Keycloak's issuer and redirect URLs follow the web, API and Keycloak ports.

Keycloak tokens carry the browser-facing issuer (`http://localhost:8080/realms/ehds-relay`),
while the API reaches Keycloak at its in-cluster address (`RELAY_OIDC_INTERNAL_URL`). Open
Keycloak in a browser at `localhost`, not at another hostname, or the issuer will not match.
Keycloak 26 marks its login cookies `Secure` even over http. Chrome and Firefox accept that on
`http://localhost`; Safari may not, so use another browser for sign-in there.

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
make api_client          # after changing routes or DTOs: regenerate the typed API client
```

The dev server proxies `/api`, `/healthz` and `/readyz` to the API on
`localhost:${API_LOCAL_PORT:-8000}` (e.g. the Tilt port-forward). Set `WEB_PORT` to run it
on another port. More in `frontend/README.md`.

The API client in `frontend/packages/api-client` is generated from the backend's OpenAPI spec
(`python -m relay.openapi`, which needs no database). Commit the regenerated spec and client
with the API change.

## API

| Method | Path | |
|---|---|---|
| GET | `/healthz` | liveness |
| GET | `/readyz` | readiness (checks the database) |
| POST | `/api/v1/organisations` | create `{"name": "Acme", "country": "NL"}` |
| GET | `/api/v1/organisations` | list |
| GET | `/api/v1/organisations/{id}` | get |
