# Handover: header, menu panel and logo

## Done

- `AppHeader` (ui): no organisation name any more; `actions` sit before the menu button with
  an 8px gap. Desktop 72px tall with 2% + 40px sides; phones 64px, 16px sides, 12px top and
  bottom, actions on their own row. Menu button 44px, 38px on phones (as designed; still above
  the 24px minimum target size).
- Icon button on blue now darkens to the yellow shade on hover (was white). The panel's close
  button opts into white on hover.
- `SideMenu` (ui): 400px, padding 22/24/26/32, close circle top right, organisation name in
  yellow 600 at 1.25em, one list, star 24px from the bottom-right corner. New `SideMenuLogOut`:
  48px yellow pill, content width, exit icon after the label, white on hover. Menu links use
  normal line height so each row is 57px like the design.
- Web shell: `ShellMenu` is shared by `OrgLayout` and `AccountLayout`, so `/account` has the
  menu too (account entries and Log out, no organisation name). Menu order: Catalogue,
  Manage my account, Manage users, Settings (owners), Switch organisation (more than one
  organisation). `HeaderBack.tsx` renders "Back to catalogue" ("Catalogue" on phones) as an
  outlined pill on blue with the yellow arrow.
- Back to catalogue shows on every organisation page except the catalogue, decided from the
  path in `OrgLayout`. On `/account` it goes to the only organisation's catalogue, to `/orgs`
  with several, and is left out with none.
- The record page no longer has its own Back to catalogue pill (still offered when the
  dataset is not found). The export page keeps "Back to record", since that goes somewhere
  else.
- The API status line is gone from the shell. `HealthStatus` still exists, unused.
- Logo: 34px header (24px phones), 40px sign-in card (30px phones).

## Checked

Measured against the design at 1280 and 390 (header, logo, menu button, back button and
icon, panel, org name, items, Log out, star, hover colours): every position and size matches
to the pixel. No horizontal scroll.

## Open

- Active menu link stays yellow (the design shows no active state).
- Form-page header actions (Clear, Generate) are not added here. A page-driven slot would be
  needed for them; today the header actions are decided by the layouts.
