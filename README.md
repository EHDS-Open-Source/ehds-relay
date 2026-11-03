# EHDS Relay

Proof of concept: FastAPI + PostgreSQL backend, run on a local kind cluster with Tilt, and a
React + Vite frontend.

Not here yet: background worker, Keycloak/OIDC, gateway.

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

## API

| Method | Path | |
|---|---|---|
| GET | `/healthz` | liveness |
| GET | `/readyz` | readiness (checks the database) |
| POST | `/api/v1/organisations` | create `{"name": "Acme", "country": "NL"}` |
| GET | `/api/v1/organisations` | list |
| GET | `/api/v1/organisations/{id}` | get |
