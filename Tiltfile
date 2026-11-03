# Tilt configuration for EHDS Relay development
#
# Prerequisites:
# - kind cluster + local registries running (make cluster up)
# Then: tilt up
#
# Tilt renders the Helm chart in deploy/helm/ehds-relay itself, builds the API image,
# pushes it to the local registry (localhost:5001) and live-syncs backend/relay into
# the running pod, where uvicorn --reload picks up the change.

load('ext://dotenv', 'dotenv')

if not os.path.exists('.dev.env'):
  local('cp .dev.env.example .dev.env', quiet=True)
dotenv('.dev.env')

CLUSTER_NAME = os.getenv('CLUSTER_NAME', 'ehds-relay')
NAMESPACE = os.getenv('NAMESPACE', 'ehds-relay')
RELEASE_NAME = os.getenv('RELEASE_NAME', 'ehds-relay-dev')
API_LOCAL_PORT = os.getenv('API_LOCAL_PORT', '8000')
POSTGRES_LOCAL_PORT = os.getenv('POSTGRES_LOCAL_PORT', '5432')
KUBE_CONTEXT = 'kind-' + CLUSTER_NAME
DOCKER_REGISTRY = 'localhost:5001'
CHART_DIR = 'deploy/helm/ehds-relay'

# Only ever deploy to the local kind cluster. allow_k8s_contexts lets Tilt use it;
# the explicit check stops `tilt up` on any other current context (this machine has
# real AKS/GKE contexts too).
allow_k8s_contexts(KUBE_CONTEXT)
if k8s_context() != KUBE_CONTEXT:
  fail('Current kube context is "{}", expected "{}". Run: kubectl config use-context {}'.format(
    k8s_context(), KUBE_CONTEXT, KUBE_CONTEXT))

# The dev DB credentials ("relay") are substrings of every resource name, so Tilt's
# secret scrubbing would mangle the logs. Dev-only throwaway credentials, safe to show.
secret_settings(disable_scrub=True)

# ==============================================================================
# HELM CHART
# ==============================================================================
if not os.path.exists(CHART_DIR + '/charts'):
  local('helm dependency build ' + CHART_DIR)

k8s_yaml(helm(
  CHART_DIR,
  name=RELEASE_NAME,
  namespace=NAMESPACE,
  set=[
    'api.image.repository={}/ehds-relay-api'.format(DOCKER_REGISTRY),
    'api.reload=true',
  ],
))
watch_file(CHART_DIR)

# ==============================================================================
# API (FastAPI, backend/)
# ==============================================================================
# Image ref has NO tag: Tilt assigns its own tag and injects it into the deployment
# (both the api container and the migrations init container).
# No entrypoint= override here: Tilt applies it to every container using the image,
# so the migrations init container would run uvicorn forever. --reload comes from
# the chart's api.reload value instead.
docker_build(
  '{}/ehds-relay-api'.format(DOCKER_REGISTRY),
  'backend',
  only=['relay', 'requirements.txt', 'alembic.ini'],
  live_update=[
    # Dependency / migration changes => full rebuild (and the init container re-runs)
    fall_back_on([
      'backend/requirements.txt',
      'backend/alembic.ini',
      'backend/relay/migrations',
    ]),
    # Python code changes => sync into the running container
    sync('backend/relay', '/app/relay'),
  ],
)

# ==============================================================================
# RESOURCES
# ==============================================================================
k8s_resource(
  RELEASE_NAME + '-postgres',
  new_name='postgres',
  port_forwards=['{}:5432'.format(POSTGRES_LOCAL_PORT)],
  objects=[
    'ehds-relay-db:secret',
    RELEASE_NAME + '-postgres-scripts:configmap',
  ],
  labels=['infrastructure'],
)

k8s_resource(
  RELEASE_NAME + '-api',
  new_name='api',
  port_forwards=['{}:8000'.format(API_LOCAL_PORT)],
  resource_deps=['postgres'],
  links=[
    link('http://localhost:{}/docs'.format(API_LOCAL_PORT), 'OpenAPI docs'),
  ],
  labels=['backend'],
)

# Manual buttons for the local checks (need `make install` first)
local_resource(
  'pytest',
  cmd='make -C backend test',
  trigger_mode=TRIGGER_MODE_MANUAL,
  auto_init=False,
  labels=['checks'],
)

local_resource(
  'lint-typecheck',
  cmd='make -C backend check',
  trigger_mode=TRIGGER_MODE_MANUAL,
  auto_init=False,
  labels=['checks'],
)

local_resource(
  'web-lint-typecheck',
  cmd='make -C frontend check',
  trigger_mode=TRIGGER_MODE_MANUAL,
  auto_init=False,
  labels=['checks'],
)

local_resource(
  'vitest',
  cmd='make -C frontend test',
  trigger_mode=TRIGGER_MODE_MANUAL,
  auto_init=False,
  labels=['checks'],
)
