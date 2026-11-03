# EHDS Relay

Backend proof of concept: FastAPI + PostgreSQL, run on a local kind cluster with Tilt.

Not here yet: background worker, Keycloak/OIDC, frontend, gateway.

## Layout

| Path | What |
|---|---|
| `backend/` | Python package `relay` (FastAPI routers in `api/`, request/response DTOs in `dtos/`, SQLAlchemy models in `domain/`, Alembic migrations) and tests |
| `deploy/helm/ehds-relay/` | Umbrella Helm chart: API + `groundhog2k/postgres` subchart (`postgres.enabled`) |
| `.kind/`, `scripts/cluster.sh` | Local kind cluster `ehds-relay` and the shared local registries |
| `Tiltfile` | Dev loop: renders the chart, builds the image, live-syncs code |

## Prerequisites

docker, kind, kubectl, helm, tilt, Python 3.13.

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
make install             # backend/.venv with pip-tools + requirements-dev.txt
make test                # pytest, against a throwaway Postgres (testcontainers, needs docker)
make check               # ruff + pyright
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

## API

| Method | Path | |
|---|---|---|
| GET | `/healthz` | liveness |
| GET | `/readyz` | readiness (checks the database) |
| POST | `/api/v1/organisations` | create `{"name": "Acme", "country": "NL"}` |
| GET | `/api/v1/organisations` | list |
| GET | `/api/v1/organisations/{id}` | get |
