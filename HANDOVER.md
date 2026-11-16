# Handover: offline banner

Status: implemented, checks pass (frontend lint, typecheck, vitest in web and ui, build).

Done
- `useOnlineStatus` hook in `ui`; `AppShell` gets a `banner` slot after the ribbon.
- `OfflineBanner` (warning, no dismiss) in the organisation and account layouts and at the top of header-less pages.
- `ConnectionToasts` in a new root layout: "You're back online." success toast, closed when offline again.
- A dataset save that throws while offline shows its own status message.
- Test renders that mount the router now wrap it in `ToastProvider`.

Next (manual, DevTools Offline)
- Catalogue, dataset with revalidation ribbon, edit form, account, organisation picker, sign-in; phone width.
- Offline save and "Save and leave"; reconnect toast; screen reader announcements.

Commands
- `cd frontend && make lint typecheck build`
- `cd frontend/packages/web && pnpm exec vitest run`
