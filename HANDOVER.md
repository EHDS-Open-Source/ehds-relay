# Handover: Keycloak, Mailpit, worker and web in the dev environment

Temporary file for picking up this branch; removed before merge.

## Status
Implemented; paused (usage limit hit) while bringing the kind cluster up under Tilt for the final
end-to-end check. The last change (moving the OIDC client secret to the `keycloak` Tilt resource
so the API pod finds it at start) is committed as WIP.

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
1. `make cluster up`, then `tilt up` (kube context `kind-ehds-relay` only).
2. Check: Keycloak `/realms/ehds-relay/.well-known/openid-configuration` via the port-forward,
   Mailpit UI, worker logs, `web` serving and proxying `/healthz`.
3. Root `make check`; `tilt down` afterwards.
4. Rebase or merge the integration branch if it has moved (the frontend landed there).

## Verify
See Next 2–3. Static: `helm lint deploy/helm/ehds-relay` and `helm template`.
