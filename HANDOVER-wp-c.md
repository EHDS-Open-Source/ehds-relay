# Handover: phone tweaks, entry screens, people, account, dialogs, toasts

## Changed
- Shared dialog (`alert-dialog.tsx`): on phones (769px and below) the footer stacks full width with the action on top; the content scrolls inside (`max-h` of the dynamic viewport minus 2rem), has a single `minmax(0,1fr)` column so a long dropdown value or button cannot push the dialog wider than the screen, and gets tighter padding on short screens. Every dialog built on it inherits this (leave, reminder, confirm, transfer, invite).
- Invite dialog: no longer keeps Cancel and Send side by side on phones; it uses the shared stacking.
- Toasts: 12px inset on phones plus left/right/bottom safe areas; action and dismiss buttons have the 44px hit area.
- Sign-in "Create one" link, the "Sign out" link on the picker/new-organisation screens, and the member role dropdowns use `hitArea`.

## Left alone (other owners)
- Invitation status chips (FilterChips), the account switch (Toggle), header logo link and skip link are in files owned by other work packages.
- At 769px and wider (including a phone in landscape at 844px) the desktop sizes apply by design, so hit areas stay at their visual size there.
