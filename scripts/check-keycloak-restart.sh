#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# Checks that restarting Keycloak keeps the dev users: deletes the Keycloak pod,
# waits for the new one, and compares user ids and the realm migration version
# before and after. Also checks the app database has at most one app_user per
# email, and that realm-init logged its migration state.
# Needs the stack running (make tilt, or make deploy). Only touches kind-ehds-relay.
###############################################################################

cd "$(dirname "$0")/.."

# shellcheck source=/dev/null
[ -f .dev.env ] && source .dev.env

CLUSTER_NAME="${CLUSTER_NAME:-ehds-relay}"
NAMESPACE="${NAMESPACE:-ehds-relay}"
RELEASE_NAME="${RELEASE_NAME:-ehds-relay-dev}"
KUBE_CONTEXT="kind-$CLUSTER_NAME"

if ! kubectl config get-contexts -o name | grep -qx "$KUBE_CONTEXT"; then
  echo "Context $KUBE_CONTEXT not found - run ./scripts/cluster.sh up first" >&2
  exit 1
fi

k() { kubectl --context "$KUBE_CONTEXT" -n "$NAMESPACE" "$@"; }

# realm-init can reach Keycloak in-cluster and has the admin login; --status prints JSON
status() { k exec "deploy/$RELEASE_NAME-keycloak-realm-init" -- python /app/realm_init.py --status 2>/dev/null; }

echo "=== Before ================================================================"
before="$(status)"
echo "$before"

echo "=== Restarting Keycloak ==================================================="
k delete pod -l "app.kubernetes.io/component=keycloak" --wait=true
k rollout status "deploy/$RELEASE_NAME-keycloak" --timeout=300s

after=""
for _ in $(seq 1 30); do
  if after="$(status)"; then break; fi
  after=""; sleep 5
done
[ -n "$after" ] || { echo "FAIL: could not read Keycloak state after the restart" >&2; exit 1; }
echo "=== After ================================================================="
echo "$after"

fail=0
[ "$before" = "$after" ] || { echo "FAIL: user ids or realm version changed" >&2; fail=1; }

echo "=== app_user duplicates ==================================================="
dups="$(k exec "$RELEASE_NAME-postgres-0" -- psql -U postgres -d relay -tA \
  -c "SELECT lower(email) FROM app_user GROUP BY 1 HAVING count(*) > 1")"
if [ -n "$dups" ]; then
  echo "FAIL: more than one app_user for: $dups" >&2; fail=1
else
  echo "none"
fi

echo "=== realm-init log ========================================================"
k logs "deploy/$RELEASE_NAME-keycloak-realm-init" | grep "at version" | tail -1 \
  || { echo "FAIL: no 'at version' line in the realm-init log" >&2; fail=1; }

[ "$fail" = 0 ] && echo "OK" || exit 1
