# Handover: OIDC sign-in through the API (backend-for-frontend)

Temporary file for picking up this branch; removed before merge.

## Status
Code complete. `make check` passes and `tests/test_session.py`, `tests/test_auth_required.py`
and `tests/test_stubs.py` pass (85 tests). The full suite and the manual check against Keycloak
in Tilt have not been run on this branch yet.

## Done
- Tables `app_user` and `user_session` (migration `0003_app_user_session`).
- `relay/auth/`: `sessions.py` (opaque cookie, hashed token in the database, idle and absolute
  expiry), `deps.py` (`current_user`, `CurrentUserDep`: 401 without a valid session),
  `csrf.py` (non-GET under `/api/` needs `X-Requested-By: ehds-relay`, else 403),
  `oidc.py` (discovery, PKCE sign-in URL via Authlib, code exchange, ID token check with
  joserfc, key refresh on an unknown key id, end-session URL).
- `relay/api/session.py`:
  - `GET /auth/login?redirect=&signup=`: state, nonce and PKCE verifier in an HttpOnly login
    cookie (`<cookie name>_login`, path `/api/v1/auth`, 10 minutes, Lax); `signup` sends
    `prompt=create`. Unsafe redirects (`//x`, `/\x`, absolute URLs, control characters) become `/`.
  - `GET /auth/callback`: checks state against the login cookie, exchanges the code, upserts
    the user by (issuer, subject) overwriting email and name, replaces any existing session,
    sets the session cookie and redirects to `web_url + redirect`. Every failure redirects to
    `/sign-in?error=signin_failed` and logs the reason (no tokens).
  - `POST /auth/logout`: now 200 `LogoutDTO{redirect_url}` (was 204). Deletes the session,
    clears the cookie, returns the provider's end-session URL (with `id_token_hint`, `client_id`,
    `post_logout_redirect_uri = web_url/sign-in`), or `web_url/sign-in` without a session or
    when the provider has no end-session endpoint.
- `tests/fake_oidc.py`: `FakeOIDC` overrides only the network calls; signs ID tokens with a
  local RSA key, checks PKCE and redirect URI on exchange, can rotate its key. Overridden per
  test via the `fake_oidc` fixture in `tests/test_session.py` (conftest.py unchanged).
- Flow tests in `tests/test_session.py`: login redirect, signup, callback creates and updates
  the user, name fallback, session replacement, state mismatch, missing or tampered login
  cookie, provider error, bad code, wrong nonce / issuer / audience, expired, no email, unknown
  signing key, key rotation, open redirects, logout with and without a session, provider
  without end-session, CSRF header on logout.
- README: "Signing in" section (flow, settings, per-checkout cookie name).

## Next
1. Run the full backend suite (`make test`, needs docker).
2. Manual check in Tilt once the Keycloak dev environment is on the base branch: sign in as
   `owner@example.org` via `http://localhost:5173/api/v1/auth/login?redirect=/`, check
   `GET /api/v1/me`, POST logout with the header, follow `redirect_url`, sign in again and expect
   the Keycloak form (no silent sign-in). The chart must pass `RELAY_WEB_URL`,
   `RELAY_OIDC_*` and the client secret to the API pod.
3. The typed API client generator is not on this branch's base; regenerate the client
   after merging so it picks up `LogoutDTO`, the logout 200 and the new query parameters.

## Blockers
None.

## How to verify
```
cd backend && make install   # first time
make check                   # ruff + pyright
.venv/bin/pytest tests/test_session.py tests/test_auth_required.py tests/test_stubs.py
make test                    # full suite; needs docker
```
