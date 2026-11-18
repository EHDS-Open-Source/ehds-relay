# The web app: the Vite build of packages/web served as static files by nginx.
# Build context is the repo root: the app imports example records from backend/tests/golden. /api, /healthz and /readyz are routed to the API by the ingress,
# so this image only serves files.

FROM node:24-slim AS build

WORKDIR /src/frontend

# pnpm at the version pinned in package.json ("packageManager")
RUN corepack enable

COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml frontend/tsconfig.base.json frontend/tsconfig.json ./
COPY frontend/packages/web/package.json packages/web/
COPY frontend/packages/ui/package.json packages/ui/
COPY frontend/packages/api-client/package.json packages/api-client/
RUN pnpm install --frozen-lockfile

COPY backend/tests/golden /src/backend/tests/golden
COPY frontend/packages packages
RUN pnpm --filter @ehds-relay/web build

FROM nginxinc/nginx-unprivileged:1.29-alpine

COPY frontend/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/frontend/packages/web/dist /usr/share/nginx/html

EXPOSE 8080
