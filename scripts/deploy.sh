#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# Plain Helm install into the local kind cluster, without Tilt.
# Builds the API image, pushes it to the local registry and installs the chart.
###############################################################################

cd "$(dirname "$0")/.."

# shellcheck source=/dev/null
source .dev.env

CLUSTER_NAME="${CLUSTER_NAME:-ehds-relay}"
NAMESPACE="${NAMESPACE:-ehds-relay}"
RELEASE_NAME="${RELEASE_NAME:-ehds-relay-dev}"
KUBE_CONTEXT="kind-$CLUSTER_NAME"
IMAGE_REPO="localhost:5001/ehds-relay-api"
IMAGE_TAG="${IMAGE_TAG:-dev}"
CHART_DIR="deploy/helm/ehds-relay"

# Never touch anything but the local kind cluster
if ! kubectl config get-contexts -o name | grep -qx "$KUBE_CONTEXT"; then
  echo "Context $KUBE_CONTEXT not found - run ./scripts/cluster.sh up first" >&2
  exit 1
fi

echo "=== Building API image =================================================="
docker build backend -t "$IMAGE_REPO:$IMAGE_TAG"
docker push "$IMAGE_REPO:$IMAGE_TAG"

echo
echo "=== Helm dependencies ==================================================="
helm dependency build "$CHART_DIR"

echo
echo "=== Installing $RELEASE_NAME into $KUBE_CONTEXT/$NAMESPACE ============="
helm upgrade --install "$RELEASE_NAME" "$CHART_DIR" \
  --kube-context "$KUBE_CONTEXT" \
  --namespace "$NAMESPACE" --create-namespace \
  --set api.image.repository="$IMAGE_REPO" \
  --set api.image.tag="$IMAGE_TAG" \
  --set api.image.pullPolicy=Always \
  --wait --timeout 5m

echo
echo "Done. Port-forward the API with:"
echo "  kubectl --context $KUBE_CONTEXT -n $NAMESPACE port-forward svc/$RELEASE_NAME-api 8000:8000"
