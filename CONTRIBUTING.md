# Contributing to EHDS Relay

Thank you for your interest in contributing! This document explains how to
propose changes, report bugs and send code to the project.

EHDS Relay is a proof of concept: a FastAPI and PostgreSQL backend with a React
frontend, run locally on a kind cluster with Tilt. Things change quickly, so
please talk to us before you put a lot of work into a change.

## Ways to contribute

- **Report a bug**: open a [GitHub issue](https://github.com/EHDS-Open-Source/ehds-relay/issues) using the bug report template.
- **Request a feature**: open an issue using the feature request template, describing the use case and the problem it solves.
- **Improve documentation**: typo fixes, clarifications and new examples are all welcome.
- **Submit code**: fix a bug, implement a feature or improve test coverage.

## Before you start

For anything beyond a small fix, please open an issue first (or comment on an
existing one) to discuss the approach. This avoids duplicated effort and makes
sure the change fits the project's direction before you invest time in a pull
request.

## The stack

- **Backend** (`backend/`): Python 3.13, FastAPI, SQLAlchemy and Alembic on
  PostgreSQL, with a background worker. Tests use pytest.
- **Frontend** (`frontend/`): React and Vite in a pnpm workspace. Tests use
  vitest.
- **Sign-in**: Keycloak (OpenID Connect) in development.
- **Local environment**: a kind cluster, driven by Tilt and a Helm chart in
  `deploy/helm/ehds-relay/`.

The [README](README.md) has the full layout and the list of local services and
ports. [AGENTS.md](AGENTS.md) describes the code conventions in more detail.

## Development workflow

1. **Fork** the repository and clone your fork locally.
2. **Create a branch** for your change:
   ```bash
   git checkout -b fix/short-description
   ```
3. **Set up your environment.** You need docker, kind, kubectl, helm, tilt,
   Python 3.13, Node 24 and pnpm (see the README for details), then:
   ```bash
   make install     # backend virtualenv and frontend dependencies
   make cluster up  # local kind cluster and registries
   tilt up          # deploy everything with live reload
   ```
4. **Make your change**, keeping commits focused and descriptive.
5. **Add or update tests** covering the change where applicable.
6. **Run the checks** locally before opening a pull request:
   ```bash
   make check   # ruff and pyright; eslint, prettier and tsc
   make test    # pytest (needs docker running) and vitest
   ```
7. **Regenerate the API client** if you changed routes or request and response
   shapes, and commit the result:
   ```bash
   make api_client
   ```
   Please do not edit the generated files by hand.
8. **Update documentation** (README, docstrings and so on) if behaviour changes.

If you change Python dependencies, declare them in `backend/pyproject.toml` and
run `make pip_compile pip_compile_dev` rather than editing the requirements
files by hand.

## Submitting a pull request

- Open your pull request against the `main` branch.
- Fill in the pull request template, including a clear description of *what*
  changed and *why*.
- Link the related issue (for example `Closes #123`) if one exists.
- Keep pull requests focused. Smaller, single-purpose changes are reviewed
  faster than large ones.
- Be responsive to review feedback. The maintainers merge pull requests, and
  nothing is merged without a maintainer's review. They may ask for changes
  first.
- This is a public repository. Please do not include secrets, credentials,
  personal data or links to private documents in code, commits, issues or pull
  requests.

## Commit messages

Use short, descriptive commit messages in the imperative mood, for example
`Fix token refresh on expired session` rather than `Fixed a bug`. Add a few
lines of explanation in the body when the reason for the change is not obvious.

## Coding style

- Follow the existing code style and structure used elsewhere in the
  repository. `make check` enforces formatting and linting.
- Keep functions small and testable, and prefer clear naming over comments that
  explain unclear naming.
- Add tests alongside new functionality. Pull requests without tests for new
  behaviour may be asked to add some before merge.

## Code of Conduct

This project follows a [Code of Conduct](CODE_OF_CONDUCT.md). By participating,
you agree to abide by its terms.

## Licensing

EHDS Relay is licensed under the GNU Affero General Public License v3.0
(AGPL-3.0), as set out in the [LICENSE](LICENSE) file. By contributing, you
agree that your contributions will be licensed under the same licence.

<!-- Open decision: the project has not yet decided whether to ask contributors
for a CLA or a DCO sign-off. Until that is settled, the inbound-equals-outbound
statement above is all we ask for. Update this section once it is decided. -->

## Getting help

If you have questions about contributing, see [SUPPORT.md](SUPPORT.md) or open
an [issue](https://github.com/EHDS-Open-Source/ehds-relay/issues).
