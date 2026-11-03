SHELL=/bin/bash
PNPM ?= pnpm

.PHONY: install dev lint format typecheck test check build api_client

install:
	$(PNPM) install --frozen-lockfile

# Vite on ${WEB_PORT:-5173}, proxying /api, /healthz and /readyz to localhost:${API_LOCAL_PORT:-8000}
dev:
	$(PNPM) dev

lint:
	$(PNPM) lint
	$(PNPM) format:check

format:
	$(PNPM) lint --fix
	$(PNPM) format

typecheck:
	$(PNPM) typecheck

test:
	$(PNPM) test

build:
	$(PNPM) build

# Regenerate packages/api-client/src/generated (TypeScript types and Zod schemas) from the committed openapi.json
api_client:
	$(PNPM) --filter @ehds-relay/api-client generate

check: lint typecheck
