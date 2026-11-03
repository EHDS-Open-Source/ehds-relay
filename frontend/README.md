# Frontend

pnpm workspace for the relay web UI: React + TypeScript + Vite, Tailwind and shadcn/ui.

| Package                                          | What                                                                        |
| ------------------------------------------------ | --------------------------------------------------------------------------- |
| `packages/web` (`@ehds-relay/web`)               | The Vite app: `index.html`, `src/main.tsx`, `src/App.tsx`                   |
| `packages/ui` (`@ehds-relay/ui`)                 | Shared components (shadcn/ui), the Tailwind theme (`styles.css`) and `cn()` |
| `packages/api-client` (`@ehds-relay/api-client`) | Typed API client, generated from the backend OpenAPI spec                   |

`ui` and `api-client` are consumed as TypeScript source via `workspace:*`; there is no
build step for them.

Needs Node 24 (`.nvmrc`) and pnpm (version pinned in `package.json`, `corepack enable`).

```bash
make install    # pnpm install --frozen-lockfile
make dev        # Vite on http://localhost:${WEB_PORT:-5173}
make check      # eslint + prettier --check + tsc
make test       # vitest
make format     # eslint --fix + prettier --write
make build      # production build into packages/web/dist
make api_client # regenerate packages/api-client/src/generated from openapi.json
```

The dev server proxies `/api`, `/healthz` and `/readyz` to
`http://localhost:${API_LOCAL_PORT:-8000}` (the API port-forward from Tilt).

## API client

`packages/api-client` wraps [openapi-fetch](https://openapi-ts.dev/openapi-fetch/) around types
that [openapi-typescript](https://openapi-ts.dev/) generates from `openapi.json`, the backend's
OpenAPI spec. Paths, params and bodies are type-checked:

```ts
import { createApiClient } from "@ehds-relay/api-client";

const api = createApiClient(); // relative URLs, cookies same-origin, X-Requested-By header set
const { data, error } = await api.GET("/healthz"); // data: { status: string }
```

`openapi.json` and `src/generated/` are generated and committed; never edit them by hand. After
changing a route or DTO in the backend, run `make api_client` from the repo root (it dumps the
spec with `python -m relay.openapi`, which needs no database, then regenerates the types) and
commit the result. CI fails if they are out of date. From `frontend/`, `make api_client` only
regenerates the types from the committed spec.

Add a shadcn component to `ui` with `pnpm dlx shadcn@latest add <name>` from `packages/ui`.

## Adding a screen

Routes are org-scoped (`/orgs/$orgId/...`) and defined in code, not generated.

1. Write the page component in `packages/web/src/pages/`. Page text goes in `packages/web/src/shell/messages.ts`.
2. Add a route for it in `packages/web/src/router/routes.ts`, under `orgRoute` for screens that live inside an organisation.
3. For a menu entry, add an item to `packages/web/src/shell/nav.ts` (`requires: "owner"` hides it from other members).
4. Build the page from the layout pieces in `@ehds-relay/ui` (`PageHeader`, `EmptyState`, ...). Those never import the router; the app passes links in through `renderLink`.

Signed-in state comes from the session store in `packages/web/src/session/` (see below).

See `../AGENTS.md` for conventions.

## Sign-in and session

Signing in leaves the app: `/sign-in` is our own page, and its "Sign in" and "Create one" links go
to `/api/v1/auth/login?redirect=...` (plus `signup=true`), which the API turns into redirects to
Keycloak and back. The app then loads the session once (`GET /api/v1/me` and
`GET /api/v1/organisations`, see `packages/web/src/session/`) and the route guards read it from
there. `/orgs` forwards people with no organisation to `/orgs/new` and people with one straight to
its catalogue. Sign-out posts to `/api/v1/auth/logout` and goes to the sign-out address it returns;
a 401 from any later call sends the user back to `/sign-in` with the current page as `redirect`.
Tests use `session/testing.ts`, a store that never calls the API.

## Queries

`$api` in `packages/web/src/api.ts` wraps the same client as typed TanStack Query hooks
([openapi-react-query](https://openapi-ts.dev/openapi-react-query/)), e.g.
`$api.useQuery("get", "/api/v1/organisations/{org_id}/datasets", { params: { path: { org_id } } })`.
After a save that changes the list, invalidate it with the matching key
(`queryClient.invalidateQueries({ queryKey: ["get", "/api/v1/organisations/{org_id}/datasets"] })`).
The catalogue searches and filters in the browser over the full list.
