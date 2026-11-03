# Handover: OIDC sign-in through the API (backend-for-frontend)

Temporary file for picking up this branch; removed before merge.

## Status
In progress. The session seam is done and committed; the OIDC sign-in flow is being written.

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
1. Finish `relay/auth/oidc.py` (`OIDCClient`, `get_oidc_client`) and the real
   `/auth/login`, `/auth/callback`, `/auth/logout` (200 with `LogoutDTO{redirect_url}`).
2. `backend/tests/fake_oidc.py` and flow tests in `backend/tests/test_session.py`.
3. README: signing in during development; per-checkout cookie name.

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
