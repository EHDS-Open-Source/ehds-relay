# Handover

Status: implemented, checks and touched tests pass. Ready for the full test run.

Done
- Worker job `queue_revalidation_reminders` (every 5 minutes) in `backend/relay/jobs/reminders.py`.
  Published datasets with a due, unsent reminder date get one outbox email per recipient (Owners
  plus the member who set it, each once, minus those who opted out). Drafts are left unmarked.
- Email content in `relay/email/messages.py`; recipient lookup in `relay/domain/reminders.py`.
- README note; tests in `tests/test_revalidation_reminder_email.py`, `test_email_outbox.py`,
  `test_mailpit.py`, `test_worker.py`.
- No migration, route or client change.

Next
- `make -C backend test` (needs docker), then `make check`.
- Manual: in Tilt, set a published dataset's reminder date in the past, wait up to 5 minutes, see
  one email per Owner in Mailpit and none on later runs.
