# Handover: account page tabs

Status: done, ready for testing.

The account page now has two tabs, User details (default) and Security, using the shared Radix
`Tabs`. The tab is kept in the URL as `?tab=security` (default left out, history replaced). A
return from the identity provider with `?password=...` opens Security. Both panels stay mounted so
a half-typed name survives switching. Security has a primary "Change password" button with a lock
icon, linking to the provider via the API. Sign out stays next to Save.

Verified: frontend `make check` passes; `AccountPage.test.tsx` passes (29 tests). The full vitest
run showed timeouts in unrelated dataset form tests while the machine was loaded.

Next:
- `cd frontend && pnpm exec vitest run packages/web/src/pages/AccountPage.test.tsx`
- By hand: keyboard through the tabs, reload `/account?tab=security`, do the password round trip.
