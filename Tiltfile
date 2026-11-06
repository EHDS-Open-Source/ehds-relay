# Tilt configuration for EHDS Relay development
#
# Prerequisites:
# - kind cluster + local registries running (make cluster up)
# Then: tilt up
#
# Tilt renders the Helm chart in deploy/helm/ehds-relay itself, builds the API image,
# pushes it to the local registry (localhost:5001) and live-syncs backend/relay into
# the running pods: uvicorn --reload restarts the API and watchfiles restarts the worker.
# Keycloak and Mailpit run in the cluster; the Vite dev server (web) runs on the host.

load('ext://dotenv', 'dotenv')

if not os.path.exists('.dev.env'):
  local('cp .dev.env.example .dev.env', quiet=True)
dotenv('.dev.env')

CLUSTER_NAME = os.getenv('CLUSTER_NAME', 'ehds-relay')
NAMESPACE = os.getenv('NAMESPACE', 'ehds-relay')
RELEASE_NAME = os.getenv('RELEASE_NAME', 'ehds-relay-dev')
API_LOCAL_PORT = os.getenv('API_LOCAL_PORT', '8000')
POSTGRES_LOCAL_PORT = os.getenv('POSTGRES_LOCAL_PORT', '5432')
KEYCLOAK_LOCAL_PORT = os.getenv('KEYCLOAK_LOCAL_PORT', '8080')
MAILPIT_UI_LOCAL_PORT = os.getenv('MAILPIT_UI_LOCAL_PORT', '8025')
MAILPIT_SMTP_LOCAL_PORT = os.getenv('MAILPIT_SMTP_LOCAL_PORT', '1025')
WEB_PORT = os.getenv('WEB_PORT', '5173')
SESSION_COOKIE_NAME = os.getenv('RELAY_SESSION_COOKIE_NAME', 'relay_session')
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
  # helm only resolves a dependency from a repo that is in its repo list (no-op if present)
  local('helm repo add groundhog2k https://groundhog2k.github.io/helm-charts/ && helm dependency build ' + CHART_DIR)

k8s_yaml(helm(
  CHART_DIR,
  name=RELEASE_NAME,
  namespace=NAMESPACE,
  set=[
    'api.image.repository={}/ehds-relay-api'.format(DOCKER_REGISTRY),
    'api.reload=true',
    'worker.reload=true',
    'mailpit.enabled=true',
    # Browser-facing addresses: the web app (sign-in redirects, the session cookie and
    # invitation links), Keycloak's issuer, and where Keycloak may redirect to after sign-in.
    # They follow the local ports so several checkouts can run side by side.
    'web.url=http://localhost:{}'.format(WEB_PORT),
    'session.cookieName={}'.format(SESSION_COOKIE_NAME),
    'keycloak.hostname=http://localhost:{}'.format(KEYCLOAK_LOCAL_PORT),
    'keycloak.apiUrl=http://localhost:{}'.format(API_LOCAL_PORT),
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

# Background worker: same image as the API (so live updates sync into it too), run with
# `python -m relay.worker` under watchfiles for reload.
k8s_resource(
  RELEASE_NAME + '-worker',
  new_name='worker',
  resource_deps=['postgres'],
  labels=['backend'],
)

# Keycloak in dev mode with its data in its own database on the bundled Postgres. The ehds-relay
# realm (deploy/helm/ehds-relay/files) is imported once; users keep their ids across restarts.
# Later realm edits are applied by the keycloak-realm-init resource below. Test users: owner,
# standard, invitee (password = username).
k8s_resource(
  RELEASE_NAME + '-keycloak',
  new_name='keycloak',
  port_forwards=['{}:8080'.format(KEYCLOAK_LOCAL_PORT)],
  # The OIDC client secret is shared with the API but grouped here: this resource has no
  # image build, so it deploys first and the pod finds the secret straight away.
  objects=[
    RELEASE_NAME + '-keycloak-realm:configmap',
    RELEASE_NAME + '-keycloak:secret',
    RELEASE_NAME + '-oidc:secret',
  ],
  links=[
    link('http://localhost:{}/admin'.format(KEYCLOAK_LOCAL_PORT), 'Keycloak admin (admin/admin)'),
    link('http://localhost:{}/realms/ehds-relay/account'.format(KEYCLOAK_LOCAL_PORT), 'Account console'),
  ],
  labels=['auth'],
)

# Applies realm JSON additions to the existing realm and runs the run-once migrations
# (deploy/helm/ehds-relay/files/realm-init). Restarts when the realm or the script changes.
k8s_resource(
  RELEASE_NAME + '-keycloak-realm-init',
  new_name='keycloak-realm-init',
  objects=[RELEASE_NAME + '-keycloak-realm-init:configmap'],
  resource_deps=['keycloak'],
  labels=['auth'],
)

# Mailpit catches all outgoing email (SMTP from the worker and Keycloak).
k8s_resource(
  RELEASE_NAME + '-mailpit',
  new_name='mailpit',
  port_forwards=[
    '{}:8025'.format(MAILPIT_UI_LOCAL_PORT),
    '{}:1025'.format(MAILPIT_SMTP_LOCAL_PORT),
  ],
  links=[
    link('http://localhost:{}'.format(MAILPIT_UI_LOCAL_PORT), 'Mailpit inbox'),
  ],
  labels=['infrastructure'],
)

# Vite dev server. Runs on the host rather than in the cluster: Vite's own hot module
# reload is the live-update loop, and it proxies /api and the health endpoints to the API
# port-forward above (same origin, so the BFF session cookie works without CORS).
if os.path.exists('frontend/Makefile'):
  local_resource(
    'web',
    cmd='make -C frontend install',
    deps=['frontend/pnpm-lock.yaml'],
    serve_cmd='make -C frontend dev',
    serve_env={'WEB_PORT': WEB_PORT, 'API_LOCAL_PORT': API_LOCAL_PORT},
    readiness_probe=probe(http_get=http_get_action(port=int(WEB_PORT), path='/')),
    resource_deps=['api'],
    links=[
      link('http://localhost:{}'.format(WEB_PORT), 'Web app'),
    ],
    labels=['frontend'],
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
