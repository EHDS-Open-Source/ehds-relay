# Handover: organisations, memberships and roles

## Status
Implementation done and pushed. `make check` passes; the touched test files pass
(`test_organisations.py`, `test_members.py`, `test_datasets.py`, `test_stubs.py`,
`test_auth_required.py`: 117 tests). The full `make test` has not been run from this branch.

## Done
- `membership` table (migration `0004`): primary key (org_id, user_id), role `owner` or
  `standard`, cascades when the organisation or user is deleted. Datasets do not reference it,
  so removing a member keeps their datasets.
- `relay/auth/authz.py`: `require_member` (404 for non-members and deleted organisations),
  `require_owner` (403 for Standard), aliases `MemberDep` / `OwnerDep`, plus `lock_org` and
  `recheck_owner` for membership changes. This is the one place to add the per-request database
  context for row-level security and the suspended-organisation write block later (TODO there).
- `POST /organisations` creates the Owner membership in the same transaction.
  `GET /organisations` lists only the caller's organisations (not deleted), ordered by name.
  `GET /organisations/{id}` needs membership; `PATCH /organisations/{id}` is Owner-only and
  rejects an explicit null.
- Members: `GET` (Owner-only; Owners first, then by name), `PATCH /{user_id}` (role change;
  same role is a no-op 200), `DELETE /{user_id}` (204). Last Owner: 409 with detail
  "cannot remove or demote the last owner". An Owner may step down or leave when another
  Owner exists.
- Dataset and export routers depend on `require_member` at router level (a one-line change, so it
  merges cleanly with the dataset metadata work). The existing dataset-belongs-to-org check stays.
- New test fixtures in `conftest.py`: `as_user`, `owner` (same person as `user`, so `client` is the
  Owner), `standard`, `outsider`, `add_member`, `org`.

## API shape changes (tell the frontend)
- `OrganisationCreateDTO.country` is now required (`^[A-Z]{2}$`). The response field stays
  nullable for older rows.
- `OrganisationDTO.role` (`owner` | `standard`) is new and required: the caller's role.
- `OrganisationUpdateDTO`: explicit `null` for `name` or `country` gives 422.
- `MemberRole` moved to `relay/domain/memberships.py`; `relay/dtos/membership.py` re-exports it.
  Schema name and values are unchanged.

## Concurrency
Member PATCH and DELETE lock the organisation row (`SELECT ... FOR UPDATE`) before reading the
target and counting Owners. Because the Owner check in the dependency runs before the lock, the
caller's role is read again after the last-Owner check; a caller demoted by a concurrent request
then gets 403. In the mutual-demotion race the second request gets 409.
`test_mgt_5_concurrent_demotions_keep_one_owner` holds the lock itself until both requests are
waiting on it, so it really exercises the race (it fails if the lock is removed).

## Next
- Tester: run the full `make test`.
- Regenerate the API client (`make api_client`) once this is on a base that has the client
  generator; this branch's base does not have it yet.

## Blockers
None.
