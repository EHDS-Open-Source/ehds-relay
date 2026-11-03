# Handover: notification settings and organisation list

Temporary file for picking up this branch; delete it before merging.

## Done
- The account page lists the user's organisations (name, country, role), read from the session.
- Notification settings: `GET` and `PUT /api/v1/me/notifications`. Body shape
  `{"settings": [{"kind": "revalidation_reminder", "enabled": false}]}`; kinds left out keep their
  setting, unknown kinds give 422, a session and the CSRF header are required. Everything is on
  until switched off.
- Kinds live in `relay/domain/notifications.py` (`NotificationKind`); add a member there and a label
  in `web/src/shell/messages.ts` to add one. Only courtesy mail is listed; invitations and similar
  stay always on.
- `is_enabled(session, user_id, kind)` is the check for code that queues a courtesy email.
  Nothing calls it yet; no email, job or sending was built.
- Account page has a "Notifications" section with one switch per kind, saved as soon as it is changed.

## Before merging
- Migration `0010` currently has `down_revision = "0008"`. When the dataset reminder migration
  (`0009`) merges, change it to `"0009"` and update the `Revises:` line in its docstring.
- This file replaces the integration-branch handover that was at this path; keep whichever is
  needed when merging.
- The manual browser check of the account page is still open.
