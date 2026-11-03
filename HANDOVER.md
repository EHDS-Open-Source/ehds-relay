# Handover: dataset permissions and tenant isolation

## Status
Implementation done and pushed, including Save and Publish and the title rule (the dataset
metadata reshape branch is merged in). `make check` passes. These test files pass (151 tests):
`test_tenant_isolation.py`, `test_datasets.py`, `test_stubs.py`, `test_auth_required.py`,
`test_organisations.py`, `test_members.py`, `test_session.py`, `test_rdf.py`,
`test_dataset_metadata.py`. The full `make test` has not been run from this branch.

## Migration number: must be re-pointed when merging
`backend/relay/migrations/versions/0007_dataset_rls.py` has revision `"0007"` but
`down_revision = "0004"` for now, because the invitation outbox (`0005`) and job queue (`0006`)
migrations live on another branch. When the two branches are merged, set its
`down_revision` to `"0006"` (and update the `Revises:` line in its docstring). Until then
Alembic sees a single chain 0004 -> 0007 on this branch.

## Done
- Row-level security on `dataset`, enabled and forced (the app role owns the table, so FORCE is
  what makes the policy apply to it). The policy compares `org_id` with
  `app.current_org_id`; with no setting, nothing is visible and nothing can be written.
  Writes for another organisation fail (`WITH CHECK`). No other table has RLS.
- `relay/db.py`: `set_tenant(session, org_id)` stores the organisation on the session and sets
  `app.current_org_id` transaction-locally; an `after_begin` listener on `Session` sets it again
  for every later transaction, so `commit()` followed by `refresh()` still works.
- `require_member` calls `set_tenant`, so every dataset and export route runs under the
  caller's organisation. The app-level `ds.org_id != org_id` check stays as a second guard.
  No repository layer, by decision.
- Datasets:
  - `DatasetCreateDTO` / `DatasetUpdateDTO` take `publish: bool = false`. `metadata` is now
    required on create too.
  - Saving without a title is 422, also for drafts.
  - `publish: true` publishes if nothing is missing; otherwise it saves as a draft (200/201)
    and the response lists `missing_for_publish`.
  - `publish: false` always stores a draft, so it takes a published dataset back to draft.
    The old 422 "published dataset requires ..." on PUT is gone. A published dataset never has
    missing fields.
  - `DELETE /datasets/{id}`: 204 for an Owner, 403 for Standard, 404 for non-members and
    other organisations' datasets. Hard delete, no version check, no audit entry yet.
  - `POST /datasets/{id}/publish` is unchanged.
- Tests: the app in tests now connects as a `relay` role (login, not superuser, not BYPASSRLS)
  that runs the migrations and so owns the tables, as in the dev Helm setup. Fixtures that
  arrange and inspect rows (`db`, `engine`, the TRUNCATE) stay on the superuser. New fixtures:
  `app_database_url`, `app_engine`. `test_tenant_isolation.py` runs raw SQL as `relay` to
  show RLS works without the app's own checks; removing the `set_tenant` call makes 37 tests
  fail.
- Also fixed: the CSRF test in `test_session.py` did not send the now-required `country`.

## API shape changes (tell the frontend)
- `publish` on dataset create and update (additive).
- Create and update without a title: 422 (stricter). Create without `metadata`: 422.
- PUT with `publish: false` on a Published dataset stores Draft.
- `publish: true` with missing fields returns 200/201 with `status: "draft"`.
- `DELETE /datasets/{id}` is real (was 501).

## Next
- Tester: run the full `make test`.
- `make api_client` does not exist on this branch's base, so the client is not regenerated.
  Run it once this is on a base that has the generator, and commit the spec and client.
- Re-point the migration (see above) when merging with the invitations branch.
- Not done: the manual check in Tilt (`psql` as `relay`, and the API calls).

## Blockers
None.
