SHELL=/bin/bash
PNPM ?= pnpm

.PHONY: install dev lint format typecheck test check build api_client e2e screenshots keycloak_theme

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

# Copy the brand tokens, Poppins, the stars and the favicons into the Keycloak theme
# (deploy/helm/ehds-relay/files/keycloak-theme). Commit the result; a test fails while they differ.
keycloak_theme:
	node scripts/sync-keycloak-theme.mjs

# Playwright specs in e2e/ against a running stack (Tilt): the web app on ${WEB_PORT:-5173}.
# Not part of `make test`. Needs a browser once: pnpm exec playwright install chromium
e2e:
	$(PNPM) e2e $(ARGS)

# Full-page screenshots of the core screens in ~/ehds-relay-screenshots/<today>/ for design review,
# against the running stack (Tilt) on ${WEB_PORT:-5173}. Read-only. Needs a browser once:
# pnpm exec playwright install chromium. UI_URL, FN_USER, FN_PASSWORD and OUT_DIR override the defaults.
screenshots:
	$(PNPM) screenshots
