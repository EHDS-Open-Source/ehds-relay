# Handover: organisation ownership transfer

Status: implemented, `make check` green, members/organisations/auth tests pass (82). Full test run still to do.

Done
- `POST /api/v1/organisations/{org_id}/members/{user_id}/transfer-ownership` (Owner only, no body, returns the new Owner).
- Under the organisation lock: target becomes Owner, caller becomes Standard. Other Owners unchanged.
- 404 if the target is not a member; 409 if the target is already an Owner (including the caller).
- Role change (PATCH), removal and Owner invitations are unchanged.
- Tests in `backend/tests/test_members.py`, route added to the cross-tenant table; client regenerated.

Next
- `make test` (needs docker).
- Web follow-up: after a transfer, refetch the session (the caller is now Standard) and map the 409 detail.
