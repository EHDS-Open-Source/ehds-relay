# Handover: members, settings and account restyle

- Members: card rows (name, email, joined date); owners still change roles with the per-row
  select, now `w-44` so "Standard" fits. Remove is a row-style button; confirmations name the
  person in bold; results show as toasts.
- Invitations: invite form stays inline (email marked required); pending shows an "Invite sent"
  info tag, Resend and Cancel invitation are secondary buttons.
- Settings and account: required stars via `Field`, Save changes shows "Saved" for 1.8s
  (`pages/useSavedFlash.ts`), notification switches use `Toggle`, organisations are card rows
  with a role tag. Notification results are toasts.
- Page title for members is now "Manage users". Settings page title left as "Organisation settings".
- Tests: `renderAs` and the settings/account/routes tests now mount `ToastProvider`
  (routes tests skip it when signed out, because its empty alert region clashes with the sign-in
  message assertions). Labels with a required star are matched by prefix.
- Not here: transfer ownership, seats, billing, invite pop-up with message, account tabs.
