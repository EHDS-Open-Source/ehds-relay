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
```

The dev server proxies `/api`, `/healthz` and `/readyz` to
`http://localhost:${API_LOCAL_PORT:-8000}` (the API port-forward from Tilt).

Add a shadcn component to `ui` with `pnpm dlx shadcn@latest add <name>` from `packages/ui`.

See `../AGENTS.md` for conventions.
