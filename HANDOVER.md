# Handover: name and personal message on invitations (backend)

Status: backend done and checked; frontend deliberately left for the invite pop-up branch stacked on this one.

## Done
- `invitation` gets nullable `name` and `message` columns (migration 0011, one head).
- Create requires `name` (trimmed, whitespace collapsed, max 200) and takes an optional `message`
  (trimmed, blank becomes null, max 1,000). Responses echo both (null on older rows).
- The invitation email greets by name and includes the message, escaped in HTML (line breaks become
  `<br>`). The Subject is unchanged. Resend re-uses the stored values. Accept and preview unchanged.
- Client regenerated with `make api_client` (openapi.json, schema.ts, zod.gen.ts).
- Tests: `backend/tests/test_invitations.py`, `test_email_outbox.py`, `test_mailpit.py`.

## Known frontend failures (expected)
`pnpm typecheck` fails in the web package until the pop-up lands:
- `src/members/queries.ts` (`useInvite` sends no `name`).
- `src/members/testUtils.tsx` (invitation fixture lacks `name` and `message`).
No Name field was added to the old inline form on purpose.

## Next
- Build the invite pop-up on a branch stacked on this one; ship both in one PR.
- Mention the API contract change (create requires `name`) in the PR.
- Before merging, check no other branch added migration 0011 and rerun `make api_client`.
- Checks: `make -C backend check`; `.venv/bin/pytest tests/test_invitations.py tests/test_email_outbox.py tests/test_mailpit.py` in `backend`.
- The full backend `make test` has not been run.
