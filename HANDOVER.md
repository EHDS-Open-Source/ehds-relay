# Handover: revalidation reminder date and overdue flag

Temporary file for picking up this branch. It is not part of the change. Delete or replace it when
the branch is merged.

## What this branch does
Members can set a date to be reminded to revalidate a dataset's metadata. Published datasets that
have gone a year without validation are flagged "Overdue". This branch was cut from `mvp-integration`.

## Status
Done and tested: 351 backend tests and 254 frontend tests pass, and `make check` and the frontend
build pass. A manual check in the browser is still left (see "Next").

## Backend
- `PUT /api/v1/organisations/{org_id}/datasets/{dataset_id}/revalidation-reminder` with body
  `{"reminder_date": "YYYY-MM-DD" | null}` sets, changes or clears the date. This was a 501 stub;
  its body field was renamed from `due_date` to `reminder_date`.
  - Any member (Owner or Standard) can call it. Non-members get 404, and so does a dataset in another
    organisation.
  - The date must be after today (UTC) and at most 5 years ahead. Otherwise the route returns 422
    with a plain-words `detail`.
  - Setting a date records who set it (`reminder_set_by`, and through it `reminder_set_by_name`) and
    when (`reminder_set_at`). It also clears `reminder_sent_at`, so a changed date gets its own
    email. `null` clears all of them.
  - It does not bump the dataset `version` or `updated_at`, so an edit form that is open at the same
    time does not hit a version conflict.
- New fields on `DatasetDTO`: `reminder_date`, `reminder_set_by`, `reminder_set_by_name`,
  `reminder_set_at`, `reminder_sent_at`, `published_at`, `last_revalidated_at`, and the computed
  `last_validated_at` and `overdue`. None of these are in the exported Health DCAT-AP record.
- **What "last validated" means for now:** the later of `published_at` and `last_revalidated_at`.
  - `published_at` is set every time a save or publish ends with the dataset published. It is kept
    when the dataset goes back to draft.
  - `last_revalidated_at` is not set by anything yet. The planned "Revalidate" action
    (`POST .../revalidate`, still a 501 stub) should set it to now.
  - A dataset is **overdue** when it is published and one calendar year has passed since
    `last_validated_at` (29 February goes to 28 February). Drafts are never overdue.
- Migration `0009_dataset_revalidation_reminder` (down revision `0008`) adds the columns, a
  partial index for due reminders, and backfills `published_at` from `updated_at` for datasets that
  are already published. The backfill turns forced row-level security off for that one statement
  and back on.
- For the reminder email job, `relay/domain/reminders.py` has:
  - `due_revalidation_reminders(session, today=None)`: every reminder due on or before `today`
    that has not been sent, across organisations that are not deleted. It returns the dataset and
    the member who set it (None if they have left the organisation). It scopes the session to each
    organisation in turn, so give it a session of its own.
  - `mark_revalidation_reminder_sent(session, org_id, dataset_id, reminder_date)`: marks one
    reminder sent unless the date changed in the meantime. It does not commit.
- Tests are in `backend/tests/test_revalidation_reminder.py`, named after the stories, including a
  migration upgrade, downgrade and upgrade on a throwaway database. The reminder route was also
  added to the cross-organisation 404 checks in `test_tenant_isolation.py`.

## Open questions (guesses made)
- Who the reminder is for: the member who last set the date. The reminder email work may also want
  to email Owners, and needs a fallback when the setter has left.
- The story asks for the change to be "written to the audit log", but there is no audit log yet.
  For now, who set the date and when is stored on the dataset.

## Frontend
- **Record page** (`pages/DatasetDetailPage.tsx`):
  - A "Set reminder" button sits between "Back to catalogue" and the other actions. It opens
    `datasets/ReminderDialog.tsx`, a date input that starts at the current date if it is still
    ahead, otherwise one year from today.
  - In the dialog, "Save reminder" saves the date and "Remove reminder" (shown only when a date is
    set) clears it. Today, past dates, empty or impossible dates and dates more than 5 years ahead
    are refused before any call to the server. Server errors are shown as plain messages.
  - The record's facts show the reminder date and who set it. A date that has passed is marked
    "date passed".
  - The facts also show "Last validated", and an "Overdue" label with a short explanation when the
    dataset is overdue.
- **Catalogue**:
  - `DatasetCard` in `ui` has an `overdue` prop that shows an "Overdue" chip.
  - The catalogue has a "Revalidation" chip group (Any / Overdue only), kept in the URL as
    `?overdue=true`.
- The date helpers are in `datasets/reminderDates.ts`. The mutation is `useSetReminder` in
  `datasets/queries.ts`. All strings are in `shell/messages.ts`.

## Next
- Manual check in the browser: set, change and remove a reminder on a record. Then, to see the
  Overdue chip, make a dataset's `published_at` more than a year old in the database.
- The reminder email work can use `due_revalidation_reminders` and
  `mark_revalidation_reminder_sent`.
- The planned Revalidate action should set `last_revalidated_at` and could move the reminder a
  year ahead.
