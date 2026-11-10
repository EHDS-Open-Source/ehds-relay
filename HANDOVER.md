# Handover: Playwright end-to-end specs and the ci-e2e workflow

## Done
- `frontend/e2e/`: Playwright config, helpers (`support.ts`) and two specs:
  - `happy-path.spec.ts`: owner signs in through Keycloak, creates an organisation, lands on
    the empty catalogue, saves a title-only draft, sees the missing-fields list after Save and
    Publish, sees the Draft chip on the catalogue card, fills the complete record with one API
    call (the full golden example), publishes from the form, sees Published on the record, opens
    View output (three format tabs, a `.ttl` download) and signs out.
  - `cross-tenant.spec.ts`: owner creates an organisation and a dataset; `standard`, in its own
    browser context, gets the not-found page for its address and a 404 from the API.
- `make e2e` (root and `frontend/`), `pnpm e2e`; e2e files are type-checked (`tsc -p e2e` in
  `pnpm typecheck`) and linted; vitest does not pick them up.
- `scripts/e2e-stack.sh`: kind cluster + image load + Helm install with the Tilt values,
  port-forward loops, readiness waits; `scripts/e2e-stack.sh logs` for a failed run.
- `.github/workflows/ci-e2e.yml`, README "End-to-end tests" section, AGENTS.md rows.

## Verified
- `make e2e` twice in a row against the running Tilt stack: 2 passed both times.
- `make check` and `make -C frontend test` (494 tests) pass.
- ci-e2e was green on its first run on this branch (temporary push trigger, since removed):
  https://github.com/EHDS-Open-Source/ehds-relay/actions/runs/42851752985 (about 4 minutes,
  both specs passed with the README passwords on a freshly imported realm).

## Notes
- The running dev realm still had the old passwords (password = username), so the local runs
  used `E2E_OWNER_PASSWORD=owner E2E_STANDARD_PASSWORD=standard`. The defaults are the README
  passwords, which a freshly imported realm (as in CI) has.
- This machine lacked `libasound.so.2` for Chromium and there is no sudo; the local runs used a
  copy extracted from the Ubuntu package via `LD_LIBRARY_PATH`. `--with-deps` handles it in CI.

## Left
- Merge the backend part (permission table) into this branch, then into `mvp-integration`, and
  confirm ci-api, ci-ui and ci-e2e are green there; run ci-e2e once by hand (workflow_dispatch)
  once the workflow is on the default branch.
