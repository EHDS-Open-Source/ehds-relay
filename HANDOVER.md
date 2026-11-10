# Handover: name and personal message on invitations (API and invite pop-up)

Status: backend and frontend done. Frontend lint, typecheck and tests pass (486 tests). Not run here: backend `make check` (no venv in this worktree) and the full backend `make test`.

## Done
- API: `invitation` gets nullable `name` and `message` columns (migration 0011, one head). Create requires `name`
  (trimmed, max 200) and takes an optional `message` (trimmed, blank becomes null, max 1,000). Responses echo both.
- The invitation email greets by name and includes the message (escaped). Resend re-uses the stored values.
- Client regenerated with `make api_client`.
- Web: "Invite user" opens an "Invite a user" pop-up (`members/InviteDialog.tsx`, same pattern as the reminder
  dialog) with email, full name, role and optional message. The organisation name is shown in bold; email is focused.
- Validation uses the generated zod limits. A 422 shows on the field named by its `loc`, a 409 on email, anything
  else as a form message; entered values are kept. Success closes the pop-up, toasts and refreshes the list.
- Pending rows show the invitee's name (email when null) with email, role and date underneath.
- Strings are in `shell/messages.ts` under `members.invitations`.

## Next
- Open one PR for this branch; mention that create now requires `name`.
- Before merging, check no other branch added migration 0011 and rerun `make api_client`.
- Run `make check` with the backend venv installed, and the backend invitation tests
  (`.venv/bin/pytest tests/test_invitations.py tests/test_email_outbox.py tests/test_mailpit.py` in `backend`).
- Try it in the browser (`make web`): open the pop-up, send, and trigger a duplicate email for the 409.
