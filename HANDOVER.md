# Feedback components handover

What changed
- `ui/src/feedback/Toast.tsx`: `ToastProvider` and `useToast()` (`show`, `dismiss`). Max 3 on screen, newest at the bottom. Success and info close after 5 seconds and pause while hovered or focused; warnings and errors stay until dismissed. Two live regions: polite for success/info, assertive for warning/error. Fade and slide in, switched off for reduced motion.
- `ui/src/feedback/Banner.tsx`: page-level message with tone, optional action and optional close button.
- `EmptyState`: dashed pale border, pale star (56px, 36px when `compact`), `compact` drops the action, `status` makes it a live status (compact is always a status).
- `ConfirmDialog` and `alert-dialog.tsx`: 24px radius, max 500px, no zoom, blue title with optional `icon`, `description` can be any React content, buttons stack full width on phones with the action on top. Cancel gets focus first (Radix default, now covered by a test).
- `web`: `createRelayApp` mounts `ToastProvider`; `pages/Loading.tsx` uses the page `LoadingStar`.
- `ui/src/messages.ts` gains a `feedback` block (Dismiss, Notifications).

Not done here
- No screen calls `useToast` or `Banner` yet; the screens that need them do that.
- Existing `EmptyState` callers are unchanged: none pass `status` yet, so no-results states are not announced until the catalogue work sets it.

Guesses
- Error toasts use the star icon (the guide's asterisk) and the notification stack is a labelled region.
