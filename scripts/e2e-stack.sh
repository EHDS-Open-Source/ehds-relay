#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# Brings up the whole stack on a kind cluster for the Playwright specs, the way
# Tilt does (same chart, same browser-facing --set values), but without Tilt or
# the local registries. CI runs this on a fresh runner; locally, `make tilt` is
# the usual way and `make e2e` runs the specs against it.
#
#   scripts/e2e-stack.sh          # create the cluster if needed, install, port-forward, wait
#   scripts/e2e-stack.sh logs     # pods and recent logs, for a failed run
#
# Leaves port-forward loops running in the background (their PIDs are in
# $E2E_STATE_DIR/port-forward.pids). Start the web app afterwards with
# `make -C frontend dev`, then `make e2e`.
###############################################################################

cd "$(dirname "$0")/.."

if [ -f .dev.env ]; then
  # shellcheck source=/dev/null
  source .dev.env
fi

CLUSTER_NAME="${CLUSTER_NAME:-ehds-relay}"
KUBE_CONTEXT="kind-$CLUSTER_NAME"
# Its own namespace and release, so it never touches a Tilt install on the same cluster
E2E_NAMESPACE="${E2E_NAMESPACE:-ehds-relay-e2e}"
E2E_RELEASE="${E2E_RELEASE:-ehds-relay-e2e}"
E2E_STATE_DIR="${E2E_STATE_DIR:-${TMPDIR:-/tmp}/ehds-relay-e2e}"
IMAGE_REPO="ehds-relay-api"
IMAGE_TAG="e2e"
CHART_DIR="deploy/helm/ehds-relay"
API_LOCAL_PORT="${API_LOCAL_PORT:-8000}"
KEYCLOAK_LOCAL_PORT="${KEYCLOAK_LOCAL_PORT:-8080}"
MAILPIT_UI_LOCAL_PORT="${MAILPIT_UI_LOCAL_PORT:-8025}"
WEB_PORT="${WEB_PORT:-5173}"
SESSION_COOKIE_NAME="${RELAY_SESSION_COOKIE_NAME:-relay_session}"
REALM="ehds-relay"

k() { kubectl --context "$KUBE_CONTEXT" -n "$E2E_NAMESPACE" "$@"; }

# Never touch anything but the local kind cluster: every kubectl and helm call below
# names this context explicitly, and the user's current context is put back afterwards.
require_context() {
  if ! kubectl config get-contexts -o name | grep -qx "$KUBE_CONTEXT"; then
    echo "Context $KUBE_CONTEXT not found" >&2
    exit 1
  fi
}

show_logs() {
  require_context
  k get pods -o wide || true
  for component in api worker keycloak realm-init mailpit; do
    echo
    echo "=== $component logs ====================================================="
    k logs -l "app.kubernetes.io/component=$component" --all-containers --tail=200 || true
  done
  if [ -d "$E2E_STATE_DIR" ]; then
    echo
    echo "=== port-forward logs ==================================================="
    tail -n 50 "$E2E_STATE_DIR"/*.log || true
  fi
}

if [ "${1:-}" = "logs" ]; then
  show_logs
  exit 0
fi

wait_for() {
  local what="$1" url="$2" seconds="${3:-300}"
  echo "Waiting for $what ($url)..."
  for _ in $(seq "$seconds"); do
    if curl -fsS -o /dev/null "$url"; then
      echo "$what is up"
      return 0
    fi
    sleep 1
  done
  echo "$what did not come up within ${seconds}s" >&2
  return 1
}

echo "=== kind cluster $CLUSTER_NAME ==========================================="
if kind get clusters | grep -qx "$CLUSTER_NAME"; then
  echo "Using the existing cluster"
else
  previous_context="$(kubectl config current-context 2>/dev/null || true)"
  kind create cluster --name "$CLUSTER_NAME" --wait 2m
  # kind switches the current context; put the user's back
  if [ -n "$previous_context" ]; then
    kubectl config use-context "$previous_context" >/dev/null
  fi
fi
require_context

echo
echo "=== API image ============================================================"
docker build backend -t "$IMAGE_REPO:$IMAGE_TAG"
kind load docker-image "$IMAGE_REPO:$IMAGE_TAG" --name "$CLUSTER_NAME"

echo
echo "=== Helm dependencies ===================================================="
# helm only resolves a dependency from a repo that is in its repo list (no-op if present)
helm repo add groundhog2k https://groundhog2k.github.io/helm-charts/
helm dependency build "$CHART_DIR"

echo
echo "=== Installing $E2E_RELEASE into $KUBE_CONTEXT/$E2E_NAMESPACE ============"
# The browser-facing values match the Tiltfile, so sign-in redirects and cookies work the same.
helm upgrade --install "$E2E_RELEASE" "$CHART_DIR" \
  --kube-context "$KUBE_CONTEXT" \
  --namespace "$E2E_NAMESPACE" --create-namespace \
  --set api.image.repository="$IMAGE_REPO" \
  --set api.image.tag="$IMAGE_TAG" \
  --set api.image.pullPolicy=IfNotPresent \
  --set mailpit.enabled=true \
  --set web.url="http://localhost:$WEB_PORT" \
  --set session.cookieName="$SESSION_COOKIE_NAME" \
  --set keycloak.hostname="http://localhost:$KEYCLOAK_LOCAL_PORT" \
  --set keycloak.apiUrl="http://localhost:$API_LOCAL_PORT" \
  --wait --timeout 8m

echo
echo "=== Port-forwards ========================================================"
mkdir -p "$E2E_STATE_DIR"
pids="$E2E_STATE_DIR/port-forward.pids"
if [ -f "$pids" ]; then
  xargs -r kill <"$pids" 2>/dev/null || true
fi
: >"$pids"

# A port-forward dies when its pod restarts, so each one runs in a loop.
forward() {
  local service="$1" ports="$2"
  nohup bash -c "while true; do
      kubectl --context '$KUBE_CONTEXT' -n '$E2E_NAMESPACE' port-forward 'svc/$E2E_RELEASE-$service' $ports
      sleep 1
    done" >"$E2E_STATE_DIR/$service.log" 2>&1 &
  echo $! >>"$pids"
}
forward api "$API_LOCAL_PORT:8000"
forward keycloak "$KEYCLOAK_LOCAL_PORT:8080"
forward mailpit "$MAILPIT_UI_LOCAL_PORT:8025"

echo
echo "=== Readiness ============================================================"
wait_for "the API" "http://localhost:$API_LOCAL_PORT/readyz"
wait_for "Keycloak" "http://localhost:$KEYCLOAK_LOCAL_PORT/realms/$REALM/.well-known/openid-configuration"
wait_for "Mailpit" "http://localhost:$MAILPIT_UI_LOCAL_PORT/"

echo "Waiting for realm-init to finish..."
for _ in $(seq 300); do
  if k logs -l app.kubernetes.io/component=realm-init --tail=-1 2>/dev/null |
    grep -q "Realm-init finished"; then
    echo "realm-init finished"
    echo
    echo "Stack ready. Start the web app with 'make -C frontend dev', then 'make e2e'."
    exit 0
  fi
  sleep 1
done
echo "realm-init did not finish within 300s" >&2
exit 1
