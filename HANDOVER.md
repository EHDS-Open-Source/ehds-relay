# Handover: account page

Temporary file for picking up this branch. Delete it before merging.

## What this branch does
- `PATCH /api/v1/me` (body `{name}`, 1-200 characters after trimming) changes the signed-in
  user's name and returns `MeDTO`. It needs a session and the CSRF header, like every other write.
- New column `app_user.name_set_by_user` (migration `0008`, default false). The PATCH sets it.
  From then on, sign-in still updates the email from the identity provider but leaves the name
  alone. A user who never changed their name keeps following the provider.
- The members list reads names from the user row, so a new name shows there in every organisation.

## Status
Backend done and tested. Migration upgrade and downgrade were checked on a throwaway Postgres.
`make api_client` is stable. Frontend in progress: "Manage my account" in the menu and the
`/account` page.

## Not done
- Frontend page and menu item.
- Not tried in Tilt or a browser.
- If another branch also adds a migration `0008`, whichever merges second must renumber and chain
  after the other, so there is a single head.
