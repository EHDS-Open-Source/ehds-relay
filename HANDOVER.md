# Handover: organisation settings screen

Temporary file for picking up this branch; delete it before merging.

## This branch
Done: "Settings" (the page behind the organisation menu) is now a form with the organisation name and
country and a Save button. Owners only: a standard member has no menu item, and opening the address
shows "only an owner can change its details". Empty and over-200-character names are explained before
anything is sent. After a save the session is reloaded, so the header, menu and organisation picker show
the new values without signing out, and a short confirmation appears. Refusals (403, 404, 422) and other
failures are shown as plain sentences. A country code that is not in the list stays selectable.
Frontend check, tests and build pass. Not yet done: a manual browser run.
Shared files touched (small, additive): `shell/messages.ts` (a `settings` block), `shell/nav.ts`
(Settings requires an owner). New: `orgs/queries.ts`.
