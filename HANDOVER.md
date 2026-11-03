# Handover: Keycloak, Mailpit, worker and web in the dev environment

Temporary file for picking up this branch; removed before merge.

## Status
Complete. The end-to-end check passed on the kind cluster under Tilt, and the integration branch
(with the frontend) is merged in. Ready for review.

## Done
- Helm chart templates: Keycloak (dev mode, realm import), Mailpit, worker, OIDC client secret.
- Realm JSON: realm `ehds-relay`, confidential client `ehds-relay-bff` (auth-code flow), test
  users owner / standard / invitee `@example.org` (dev-only passwords, local Keycloak only).
- API settings for OIDC (`oidc_issuer_url`, `oidc_client_id`, `oidc_client_secret`) and SMTP;
  defaults in `.dev.env.example`.
- Placeholder worker process (same image as the API, different entrypoint) with reload.
- Tilt resources for keycloak, mailpit, worker and `web` (runs the frontend dev server when
  `frontend/` exists).
- Verified: `helm lint` / `helm template` (defaults, Tilt-style values, each part off);
  Keycloak in plain docker (realm import, discovery issuer vs back-channel host, full
  auth-code login for all three users); Mailpit SMTP; worker reload; Tiltfile parses;
  backend `make check`.

## Next
Nothing outstanding on this branch. Remove this file before merge.

## Checked end to end
- Keycloak discovery document served via the port-forward with the localhost issuer.
- Mailpit UI up; worker started and reaches Mailpit; API healthy with the OIDC secret present.
- `web` dev server serves the app and proxies `/healthz` to the API.
- Root `make check` (backend and frontend) passes; `tilt down` cleaned up.

## Verify
See Next 2–3. Static: `helm lint deploy/helm/ehds-relay` and `helm template`.
