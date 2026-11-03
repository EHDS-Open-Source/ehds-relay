# Handover: account page

Temporary file for picking up this branch. Delete it before merging.

## What this branch does
- `PATCH /api/v1/me` (body `{name}`, 1-200 characters after trimming) changes the signed-in
  user's name and returns `MeDTO`. It needs a session and the CSRF header, like every other write.
  The email cannot be changed (an `email` field is rejected); it comes from the identity provider.
- New column `app_user.name_set_by_user` (migration `0008`, default false). The PATCH sets it.
  From then on, sign-in still updates the email from the identity provider but leaves the name
  alone. A user who never changed their name keeps following the provider.
- The members list reads names from the user row, so a new name shows there in every organisation.
- Web app: "Manage my account" is the first item in the Account part of the `⋯` menu and opens
  `/account`. That route sits outside `/orgs/...` (signed-out visitors go to sign-in and come
  back), with its own small layout (header, no organisation menu), so it also works for someone
  with no organisation.
- The page shows "Full name" (editable) and "Email address" (read-only, with a hint), "Save
  changes" and "Sign out". Saving trims the name, checks it with the generated schema, calls the
  API, shows "Your name has been saved." and reloads the session. API errors become plain
  messages. "Sign out" uses the same code as the menu.

## Status
Done apart from a manual check. Backend: the touched test files (session, stubs, auth-required,
openapi, members) pass, 100 tests. Migration upgrade, downgrade and re-upgrade were checked on a
throwaway Postgres; `alembic heads` shows one head. Frontend: `make -C frontend check test build`
pass (227 tests). Root `make check` passes. `make api_client` is stable.

## Not done
- Not tried in Tilt or a browser. To check by hand: sign in, change your name, sign out, sign in
  again, and the name should stay; the members page should show it.
- The header and menu do not show the user's name today, so the session refresh after a save
  matters only for other screens that read the user from the session.
- If another branch also adds a migration `0008`, whichever merges second must renumber and chain
  after the other, so there is a single head.
