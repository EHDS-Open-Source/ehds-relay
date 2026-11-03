# Handover: invitations with email

This branch also carries the sign-in branch and the dev-environment branch (merged in), and
the organisations/roles branch it was cut from.

## Status
Implementation done and pushed. `make check` passes. These test files pass: `test_invitations.py`,
`test_email_outbox.py`, `test_mailpit.py`, `test_worker.py`, `test_stubs.py`,
`test_auth_required.py`, `test_openapi.py` (91 tests). The full `make test` has not been run
from this branch. The manual check in Tilt has not been done.

## Done
- Merged the sign-in and dev-environment branches. `settings.py`, `.dev.env.example` and
  `README.md` conflicted; both sides were kept.
- Migration `0005`: `invitation` table (lower-cased email, role, SHA-256 of the link token,
  stored status, `invited_by`, `accepted_by`, `created_at`, `last_sent_at`, `expires_at`,
  `accepted_at`; at most one pending invitation per email per organisation) and
  `email_outbox` table.
- Migration `0006`: Procrastinate's schema, a verbatim copy of the SQL shipped with the pinned
  version (`relay/migrations/sql/procrastinate_schema_3_10_0.sql`). A Procrastinate upgrade
  needs a new migration with the upgrade scripts it ships.
- `Invitation.status` works out `expired` on read (pending and past `expires_at`), in Python
  and in SQL, so no sweep job is needed. `InvitationStatus` moved to
  `relay/domain/invitations.py`; the DTO module re-exports it.
- Routes (Owner-only unless noted):
  - `POST /organisations/{id}/invitations`: 201. Email is lower-cased. 409 if the person is
    already a member or already has a pending invitation (detail mentions resend). An
    invitation that has expired does not block a new one.
  - `GET .../invitations?status=`: newest first.
  - `DELETE .../invitations/{invitation_id}`: 204; 409 unless pending.
  - `POST .../invitations/{invitation_id}/resend`: new token (old link gives 404), new
    `expires_at`, new `last_sent_at`, new email. Pending or expired only, else 409. 409 also
    if an expired one is resent while a newer pending one exists for the same email.
  - Invitations from another organisation give 404.
  - `GET /invitations/{token}` (public): preview; 404 for unknown token or deleted organisation.
  - `POST /invitations/{token}/accept` (signed in): 403 if the account's email (any case)
    is not the invited one; 410 if cancelled or expired, or already accepted and the caller is
    not a member; 404 for unknown token or deleted organisation. Adds the membership with the
    invited role; someone already a member keeps their role. Repeating it returns 200.
    Locks the invitation row, so concurrent accepts make one membership.
- Email: the API renders the message (`relay/email/messages.py`, text and HTML) and writes it to
  `email_outbox` in the same transaction. The worker sends due rows over SMTP one at a time
  (`FOR UPDATE SKIP LOCKED`), clears the bodies once sent, and retries failures with a doubling
  delay (30 s first) up to `RELAY_EMAIL_MAX_ATTEMPTS` (5).
- Worker: `python -m relay.worker` is now a Procrastinate worker with one periodic task,
  `send_pending_emails`, every 10 seconds. It waits up to five minutes for the migrations
  (checking every 5 s), then exits. Successful jobs are deleted. Checked by hand against a real
  Postgres and Mailpit: a queued email showed up in Mailpit within 10 seconds.
- New settings: `RELAY_INVITATION_TTL_DAYS` (30), `RELAY_EMAIL_MAX_ATTEMPTS` (5).
- `test_stubs.py`: the six invitation cases are removed. API client regenerated (it also picks
  up the earlier sign-in and organisations changes, which had not been regenerated).
- README: "Email in development" section and the invitation routes.

## API shape changes (tell the frontend)
- `InvitationDTO.last_sent_at` (new, required): when the email was last sent; set on create and
  on every resend. Show it as the date sent.
- `InvitationDTO.email` comes back lower-cased.
- `?status=expired` means the expiry date has passed.
- Link format: `{RELAY_WEB_URL}/invitations/{token}`. The web route should show the preview,
  send the user to `/api/v1/auth/login?redirect=/invitations/{token}` (add `&signup=true` for
  new users), then call accept on return.
- Accept returns `OrganisationDTO` (with `role`).
- Documented error responses: create 409; cancel and resend 409; accept 403, 404, 410.

## Next
- Tester: run the full `make test`.
- Manual check in Tilt: invite `invitee@example.org`, see it in Mailpit, sign in as the invitee
  and accept. The API pod does not get `RELAY_WEB_URL` from the chart yet, so links use the
  default `http://localhost:5173`, which is right for the default dev ports only.

## Blockers
None.
