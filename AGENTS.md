# AGENTS.md

Guidance for coding agents (and humans) working in this repo. See `README.md` for the
overview and quickstart.

## Make targets

Root `Makefile` (delegates to `backend/Makefile` and `frontend/Makefile`):

| Target | What |
|---|---|
| `make cluster up` / `make cluster down [--remove-registries]` | Create/delete the kind cluster `ehds-relay` and local registries (`scripts/cluster.sh`) |
| `make tilt` | `tilt up`: postgres, api, worker, Keycloak, Mailpit and the web dev server, with live reload |
| `make deploy` | Build, push and `helm upgrade --install` without Tilt |
| `make install` | Create `backend/.venv` (Python 3.13) and install `requirements-dev.txt` + the package editable; `pnpm install --frozen-lockfile` in `frontend/` |
| `make web` | Vite dev server on `${WEB_PORT:-5173}`, proxying `/api`, `/healthz`, `/readyz` to `localhost:${API_LOCAL_PORT:-8000}` |
| `make test` | pytest (uses a throwaway Postgres via testcontainers, so docker must be running) and vitest |
| `make check` | ruff (lint + format check) and pyright; eslint, prettier --check and tsc |
| `make pip_compile` / `make pip_compile_dev` | Re-lock `requirements.txt` / `requirements-dev.txt` |
| `make api_client` | Dump the OpenAPI spec from the backend (no database or server needed) and regenerate the typed client in `frontend/packages/api-client`. Run it after changing routes or DTOs and commit the result; CI fails if it is out of date |

Backend-only extras (run from `backend/`): `make format` (ruff fix + format), `make lint`,
`make typecheck`, `make migrate` (alembic upgrade head against a local DB), `make run`,
`make openapi` (just the spec dump).

Frontend extras (run from `frontend/`): `make dev`, `make format` (eslint --fix + prettier),
`make lint`, `make typecheck`, `make build`, `make api_client` (just the client generation from the
committed spec).

Before finishing a change run `make check` and `make test`.

## Conventions

### Dependencies: pip-compile, not uv
- Declare dependencies in `backend/pyproject.toml` (runtime in `dependencies`, tooling in the `dev` extra).
- Never edit `requirements.txt` / `requirements-dev.txt` by hand. Run `make pip_compile pip_compile_dev`
  (wraps `scripts/pip_compile.sh`; hashed, pinned) and commit the results.
- Do not introduce uv, poetry or other tooling.

### Layout (`backend/relay/`)
- `api/`: FastAPI routers. Thin: parse request, call DB/domain, return.
- `dtos/`: Pydantic request/response shapes. Never expose ORM models directly.
- `domain/`: SQLAlchemy models and domain enums.
- `migrations/versions/`: Alembic migrations, numbered `NNNN_name.py`. Schema changes always get a migration.
- Tests in `backend/tests/`, one `test_<area>.py` per router/area.

### DTOs
- Name them `<Thing>DTO` (response), `<Thing>CreateDTO` / `<Thing>UpdateDTO` (request).
- Responses subclass `DTO` (`from_attributes=True`); requests subclass `RequestDTO` (`extra="forbid"`), both in `relay/dtos/base.py`.
- One module per resource in `relay/dtos/`.

### FastAPI routes
- Declare `response_model=` explicitly on every route decorator, e.g.
  `@router.get("", response_model=list[OrganisationDTO])`.
- Handlers return ORM objects, annotated with the ORM type; FastAPI serializes via the DTO.
  Do not call `model_validate` by hand in handlers and do not rely on return annotations alone.
- Set `status_code=` for non-200 success (e.g. 201 on create); raise `HTTPException` for errors.
- Routers use `prefix="/api/v1/<resource>"` and are registered in `relay/app.py`.

### Frontend (`frontend/`)
- pnpm only (no npm/yarn). Node version in `frontend/.nvmrc`, pnpm version in `packageManager`.
  Commit `pnpm-lock.yaml`; `make install` uses `--frozen-lockfile`.
- Packages: `web` (the app), `ui` (shared components and theme), `api-client` (typed API client).
  Components that another app could reuse go in `ui`, not `web`. Add shadcn components from
  `frontend/packages/ui` with `pnpm dlx shadcn@latest add <name>`.
- `ui` and `api-client` are TypeScript source with no build step, linked via `workspace:*`.
- Never hand-edit `packages/api-client/openapi.json` or `packages/api-client/src/generated/`; run
  `make api_client` after changing routes or DTOs and commit both. `src/generated/` holds the
  TypeScript types (`schema.ts`) and Zod schemas (`zod/zod.gen.ts`, exported as `zDatasetMetadata`
  etc.). Validate form input with those schemas rather than re-writing backend rules by hand.
- Call the API through the typed client (`createApiClient()` from `@ehds-relay/api-client`, shared
  as `api` in `packages/web/src/api.ts`), keyed by path, e.g. `api.GET("/healthz")`. No hand-written
  `fetch`. Requests are same-origin (relative URLs); the Vite dev server proxies them to the API.
- TypeScript is strict. Keep user-facing strings in each package's `src/messages.ts`, not inline
  in components, so they can be translated later.
- Tests sit next to the code as `*.test.ts(x)` (vitest + Testing Library).

### Keycloak realm changes
- The realm JSON is imported once. A change to a realm-level setting or to something that already
  exists needs a new append-only migration in `deploy/helm/ehds-relay/files/realm-init/migrations/`
  as well as the JSON edit (see the README). Never edit a migration that has shipped.

### CI (GitHub Actions)
- `ci-api.yml`: backend `make -C backend install check test`, on changes to `backend/**`, the API client or the realm-init files.
- `ci-ui.yml`: frontend `make -C frontend install check test build`, on changes to `frontend/**`.
- Every `uses:` is pinned to a full commit SHA with the version in a comment; keep it that way when bumping.

### kind / Tilt / kube context
- The only cluster used is the kind cluster `ehds-relay`, kube context `kind-ehds-relay`.
  This machine also has real cloud (AKS/GKE) contexts: never run kubectl/helm/tilt against any other context,
  never switch the user's current context, and pass `--context kind-ehds-relay` explicitly in ad-hoc commands.
- Tilt and `scripts/*.sh` already enforce this; keep that check when editing them.
- Local settings live in `.dev.env` (gitignored, created from `.dev.env.example`).
- Follow the PHEMS federated node repo's patterns for Tilt, kind and packaging rather than inventing new ones.

### Public repo hygiene
- This repo is public. Do not reference private planning/architecture docs, their filenames or section
  numbers in code, comments, README, commits or PRs; state rationale inline in plain words.
- Never commit secrets or `.dev.env`.

### Git
- Work on a feature branch, not `main`. Only commit when asked.

### Parallel work (several agents at once)
- One git worktree per branch under `.worktrees/<name>` (gitignored), e.g.
  `git worktree add .worktrees/my-change -b my-change mvp-integration`. Never share a checkout between agents.
- Branch from `mvp-integration`, which collects work in progress; open PRs against `main`
  (or against the branch you stack on while it is unmerged).
- Run `make check` (fast, no docker) before handing over; `make test` starts a Postgres container,
  so run it from one place at a time rather than in every worktree at once.
- Don't hard-code dev ports; read them from env with a default so worktrees can run side by side.
- A second Tilt stack in the same cluster also needs its own `NAMESPACE`, `RELEASE_NAME` and
  `RELAY_SESSION_COOKIE_NAME` in `.dev.env` and `tilt up --port <other>`; otherwise it deploys over
  the first stack (see the README).
