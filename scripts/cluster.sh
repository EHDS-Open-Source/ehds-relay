#!/usr/bin/env bash
set -euo pipefail

###################################################################################
# EHDS Relay - local kind cluster management
#
# Usage:
#   ./scripts/cluster.sh up                        # Start cluster + registries
#   ./scripts/cluster.sh down                      # Delete cluster, keep registries
#   ./scripts/cluster.sh down --remove-registries  # Delete everything
#
# The registries (kind-registry, proxy-docker-hub-registry, proxy-ghcr-registry)
# are shared with any other kind clusters on this machine and are reused if running.
###################################################################################

cd "$(dirname "$0")/.."

COMMAND="${1:-}"
REMOVE_REGISTRIES="${2:-false}"

if [ ! -f .dev.env ]; then
  echo "No .dev.env found, creating it from .dev.env.example"
  cp .dev.env.example .dev.env
fi
# shellcheck source=/dev/null
source .dev.env

CLUSTER_NAME="${CLUSTER_NAME:-ehds-relay}"
NAMESPACE="${NAMESPACE:-ehds-relay}"
KUBE_CONTEXT="kind-$CLUSTER_NAME"
KIND_CONFIG_FILE=".kind/kind-config.yaml"

if [ "$COMMAND" != "up" ] && [ "$COMMAND" != "down" ]; then
  echo "Usage: $0 <up|down> [--remove-registries]"
  echo ""
  echo "Commands:"
  echo "  up                              Start kind cluster + Docker registries"
  echo "  down                            Delete cluster, keep registries"
  echo "  down --remove-registries        Delete cluster and all registries"
  exit 1
fi

start_registry() {
  local name="$1" port="$2" remote="${3:-}"
  if [ "$(docker inspect -f '{{.State.Running}}' "$name" 2>/dev/null || true)" == "true" ]; then
    echo "$name already running"
    return
  fi
  if docker inspect "$name" >/dev/null 2>&1; then
    echo "Starting existing $name..."
    docker start "$name" >/dev/null
    return
  fi
  echo "Starting $name on localhost:$port..."
  if [ -n "$remote" ]; then
    docker run -d --restart=always -p "127.0.0.1:$port:5000" \
      -e REGISTRY_PROXY_REMOTEURL="$remote" --name "$name" registry:2 >/dev/null
  else
    docker run -d --restart=always -p "127.0.0.1:$port:5000" --name "$name" registry:2 >/dev/null
  fi
}

###############################################################################
# UP - Start cluster and registries
###############################################################################
if [ "$COMMAND" = "up" ]; then
  echo "=== Starting Docker Registries =========================================="
  start_registry kind-registry 5001
  start_registry proxy-docker-hub-registry 5002 https://registry-1.docker.io
  start_registry proxy-ghcr-registry 5003 https://ghcr.io

  echo
  echo "=== Creating Kind Cluster ==============================================="
  if kind get clusters | grep -q "^$CLUSTER_NAME$"; then
    echo "Kind cluster '$CLUSTER_NAME' already exists"
  else
    kind create cluster --name "$CLUSTER_NAME" --config "$KIND_CONFIG_FILE"
  fi

  echo "Connecting registries to kind network..."
  docker network connect kind kind-registry 2>/dev/null || true
  docker network connect kind proxy-docker-hub-registry 2>/dev/null || true
  docker network connect kind proxy-ghcr-registry 2>/dev/null || true

  echo "Applying registry discovery ConfigMap..."
  kubectl --context "$KUBE_CONTEXT" apply -f .kind/docker-registry.yaml

  echo "Ensuring namespace '$NAMESPACE'..."
  kubectl --context "$KUBE_CONTEXT" create namespace "$NAMESPACE" \
    --dry-run=client -o yaml | kubectl --context "$KUBE_CONTEXT" apply -f -

  echo
  echo "=== Cluster Ready ======================================================"
  echo "Cluster:   $CLUSTER_NAME"
  echo "Context:   $KUBE_CONTEXT"
  echo "Namespace: $NAMESPACE"
  echo
  echo "Next steps:"
  echo "  tilt up          # build, deploy and live-reload (recommended)"
  echo "  make deploy      # or a plain Helm install without Tilt"
  echo

###############################################################################
# DOWN - Tear down cluster
###############################################################################
else
  echo "=== Deleting Kind Cluster ==============================================="
  kind delete cluster --name "$CLUSTER_NAME" || true

  if [ "$REMOVE_REGISTRIES" = "--remove-registries" ]; then
    echo
    echo "=== Removing Docker Registries =========================================="
    echo "Note: these registries are shared with any other kind clusters on this machine."
    for name in kind-registry proxy-docker-hub-registry proxy-ghcr-registry; do
      docker rm -f "$name" >/dev/null 2>&1 && echo "Removed $name" || echo "$name not found"
    done
  else
    echo
    echo "Registries kept. To remove them: ./scripts/cluster.sh down --remove-registries"
  fi
fi
