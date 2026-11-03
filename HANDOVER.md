# Handover: OIDC sign-in through the API (backend-for-frontend)

Temporary file for picking up this branch; removed before merge.

## Status
Paused mid-way. The session seam is done and tested. `backend/relay/auth/oidc.py` (OIDC client:
discovery, PKCE sign-in URL via Authlib, code exchange, ID token check with joserfc, end-session
URL) is committed as work in progress: it passes ruff and pyright but has no tests and no routes
use it yet.

## Done
- Tables `app_user` and `user_session` (migration `0003_app_user_session`).
- `relay/auth/`: `sessions.py` (opaque cookie, hashed token in the database, idle and absolute
  expiry), `deps.py` (`current_user`, `CurrentUserDep`: 401 without a valid session),
  `csrf.py` (non-GET under `/api/` needs `X-Requested-By: ehds-relay`, else 403).
- Session required on organisations, datasets, members, organisation invitations, export,
  `GET/PATCH /me` and `POST /invitations/{token}/accept`. Public: `/auth/*`,
  `GET /invitations/{token}`, `/capabilities`, health.
- Test fixtures in `backend/tests/conftest.py`: `db`, `app`, `make_user`, `sign_in`, `user`,
  `client` (signed in), `anon_client`. `tests/test_auth_required.py` walks the OpenAPI paths.
- Settings: OIDC client fields plus `web_url`, `oidc_scopes`, `session_cookie_name`,
  `session_idle_minutes`, `session_max_hours`.
- Runtime dependencies Authlib, joserfc and requests (re-locked with pip-compile).

## Next
1. Add `LogoutDTO{redirect_url: str | None}` to `relay/dtos/session.py`.
2. In `relay/api/session.py`, replace the stubs, using `get_oidc_client` as a dependency:
   - `GET /auth/login?redirect=&signup=`: make state, nonce and code verifier
     (`secrets.token_urlsafe`); store them and the safe redirect (must start with `/`, not `//`
     or `/\`; else `/`) in an HttpOnly cookie `<session_cookie_name>_login`, path
     `/api/v1/auth`, max-age 600, SameSite=Lax, value base64url-encoded JSON; 302 to
     `authorization_url(redirect_uri=web_url + "/api/v1/auth/callback", ...)`, with
     `prompt="create"` when `signup`.
   - `GET /auth/callback?code=&state=&error=&error_description=`: state must match the login
     cookie; call `exchange(...)`; upsert `AppUser` by (issuer, subject), overwriting email and
     name; delete any session from the existing cookie (`pop_session`); `create_session`; set the
     session cookie (HttpOnly, Lax, path `/`, Secure when web_url is https, max-age =
     session_max_hours); delete the login cookie; 302 to web_url + redirect. Any failure: 302 to
     `web_url + "/sign-in?error=signin_failed"` and log the reason (never tokens).
   - `POST /auth/logout`: `pop_session`, clear the cookie, return 200 `LogoutDTO` with
     `end_session_url(id_token_hint=..., post_logout_redirect_uri=web_url + "/sign-in")`, or
     `web_url + "/sign-in"` when there is no session.
3. `backend/tests/fake_oidc.py`: subclass `OIDCClient`, override `_discovery`, `_fetch_jwks`,
   `_fetch_token`; sign ID tokens with a local RSA key (`joserfc.jwk.RSAKey.generate_key`).
   Override `get_oidc_client` in the `app` fixture or per test.
4. Flow tests in `backend/tests/test_session.py` (login redirect, callback creates/updates user,
   state mismatch, provider error, open redirect, logout with and without session, wrong nonce
   or issuer, key rotation).
5. README: signing in during development; per-checkout cookie name. If the client generator has
   landed on the base branch, run `make api_client` and commit.

## Blockers
- Pushing the branch was refused by the agent's permission check; push it by hand:
  `git push -u origin T-009-add-oidc-sign-in-via-bff`.

## How to verify
```
cd backend && make install   # first time
make check                   # ruff + pyright
.venv/bin/pytest tests/test_session.py tests/test_auth_required.py tests/test_stubs.py
make test                    # full suite; needs docker
```
