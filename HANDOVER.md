# Handover: forms

## Done
- `Field`: control, then its error (12px), then the hint (8px, info icon, `--blue-hint`, 0.88em/500).
  Inputs, text areas, selects and the tag input pick up the field's error and hint ids for
  `aria-describedby` through a context (`useFieldDescribedBy`), merged with any ids passed in.
- Required star sized in em (0.72em of the label, 0.25em gap), olive, magenta when the field or
  anything beneath a group is wrong (`invalid` prop; `useHasErrorUnder` / `useGroupState` in
  `datasets/fields/formState.ts`).
- `RepeatableList` takes `error`/`errorId`: the message sits under the Add button, which turns
  magenta; the group fieldset points at it through `describedBy`.
- Distribution and variable panels wrap their fieldset, so the heading sits inside the panel.
- `TagInput`: Enter or comma adds, pasted comma lists add each item, leaving the box adds,
  repeats ignored whatever the capitals ("“X” is already added."), Backspace marks the last tag
  then removes it, "Add another keyword" placeholder, "Remove keyword X" buttons, a `role=status`
  line that clears after 4 seconds, 32px pills, 12px box, 3px blue outline while typing.
  No length or count limits yet (they need the API to agree).
- `SectionNav`: sticks under the 64px header on phones (72px on wide screens), pills with 14px
  corners and 6px dots (yellow on the active one), right border on the sidebar. `useActiveSection`
  follows the scroll with an IntersectionObserver.
- `SaveButton`: label then save icon, "Saving…", then "Saved" with a tick in the success colours
  for 1.8s. Dataset form uses it as a secondary menu trigger; Settings and Account as primary.
- Save draft / Save and Publish run after the menu has closed and returned focus, so a save with
  problems moves focus to the first one for mouse users too. Settings, Account and the invite
  form focus their first invalid field on submit.
- Copy: sentence case section and field labels, guide wording for web address and email errors,
  single "…" in busy labels, messages that say what to do.

## Checked
- `make -C frontend check test build`: 348 tests pass.
- In the browser (1280 and 390): input 51px, 12/16 padding, 2px #DCDFEE; label 14.25px/600;
  star 10.25px; hint 13.2px/500 #5563DF 8px below; tag pills 32px; phone strip stays at 64px
  under the header; no sideways scroll.

## Left
- The catalogue search has `outline-none`, so it shows no focus ring when tabbed to
  (`patterns/SearchField.tsx`, catalogue work).
- `shellMessages.loading` still reads "Loading..." (loading messages are being reworked
  separately).
- The section menu does not yet swap a dot for a magenta star when its section has errors.
