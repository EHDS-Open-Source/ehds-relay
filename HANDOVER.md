# Handover: dialogs, toasts, banners, loading and busy buttons

## What changed

- **Confirmation dialogs** (`ui/src/components/alert-dialog.tsx`, `ui/src/detail/ConfirmDialog.tsx`):
  32px padding, no border, 500px wide (calc(100% - 40px) on phones), scrim token overlay,
  left-aligned header, title 1.3em/700 blue with a 24px icon, description ink 1em with 1.6
  line height (the shadcn `text-sm text-muted-foreground` default is gone, so `asChild`
  children no longer fight it), actions right-aligned with 12px gap and stacked full width
  at 480px and below. `AlertDialogContent` remembers what had focus when it opened and puts
  focus back there on close (Esc, Cancel, outside click), and takes `onOverlayClick` so a
  click on the scrim can cancel. The confirm button repeats the action icon after its label
  and shows the busy star while `pending`.
- **Icons**: `bin` (drawn stand-in, no delete artwork exists) for deleting a dataset;
  `tickCircle` (the success mark: disc with the tick cut out) for success toasts and banners.
- **Busy buttons** (`button.tsx`): the star now comes after the label and hides the button's
  own direct-child icon; the button is not `disabled` while busy (no 50% fade, keeps focus),
  is `aria-busy` and `aria-disabled`, and drops clicks, Enter/Space and form submits.
- **Toasts**: one ordered list (newest at the bottom), each toast its own live region
  (`status`/polite or `alert`/assertive), 24px from the bottom right (12px in, full width
  on phones), 14px radius, 16/12/16/16 padding, 0.95em, enter with `--motion-enter` and
  `--ease-out`. Max three, 5 s, warnings and errors stay until dismissed.
- **Banner**: spacing per the design; only for page-level states. The section load failures
  on Members, Invitations and Account notifications now use `EmptyState` with a retry.
- **Loading**: `useMinimumPending` (ui) keeps a page loader up for at least 500 ms; used on
  the dataset record, export page and tab, members, invitations, account notifications and
  the invitation page. Messages are specific and use the ellipsis character. Loader padding
  64px. The web test setup raises Testing Library's async timeout to 2.5 s for this.
- **Reminder dialog**: 420px wide, required star, saved reminder shown as a long date,
  Cancel left with Clear reminder and Save (save icon after the label) right, small
  buttons that wrap on phones. Save shows the busy star and a toast "Reminder set for
  {long date}.". Clear reminder asks first in a stacked confirmation, then toasts
  "Reminder cleared." Focus returns to the record's reminder button.
- **Copy**: delete is "Delete {title}?" with the name and "This can't be undone." in bold;
  Clear all fields names the dataset in bold.

## Notes for merging

- The catalogue page loader is not wrapped in `useMinimumPending` (catalogue files belong
  to the catalogue work); add `const loading = useMinimumPending(list.isPending)` there.
- The reminder dialog formats long dates with its own small formatter; fold it into the
  shared reminder date formatter once that one writes long dates.
- Busy labels ending in "..." (Creating, Saving, Sending, Joining) are left for the forms
  work, which is changing that wording.
- The Save changes menu still has its icon before the label (forms work moves it).

## Guesses

- The confirm button repeats the title icon in every confirmation, including Clear all
  fields and Clear reminder, where the design shows no icon on that button.
- Clear reminder is offered only when a reminder is set; the design shows it always.
- The reminder dialog description is ink 1em like the confirmations (the design uses a
  smaller size there).
