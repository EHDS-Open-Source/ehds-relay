# Form controls restyle

What changed (all in `frontend/packages/ui/src`):
- `Field`: new `required` prop (star plus hidden "(required)" text; star turns magenta when the field has an error), hint with an "i" icon, error shown through `FormMessage` (18px asterisk), `tone="onBlue"`. New `fieldHintId` helper for `aria-describedby`.
- `Input`: `tone="onBlue"` gives the underline field (white line, yellow text, pink 3px line on error).
- `RadioChoices`: 22px custom radios. New `Checkbox` and `Toggle` (native inputs restyled; the toggle has `role="switch"`). All accept `tone`.
- `TagInput`: one boxed field with 32px pills and an icon remove button. Behaviour unchanged.
- `RepeatableList`: Add is a secondary button with a plus icon, Remove is an icon button (still named "Remove N").
- `SectionNav`: 260px sidebar with a blue active pill; a scrolling strip along the top on phones.

Tests: new required-star, error, hint and `aria-describedby` cases in `Field.test.tsx`; `controls.test.tsx` (checkbox, switch); active entry in `SectionNav.test.tsx`.

Notes for later work:
- No counters, limits, custom dropdown or date picker (restyle only).
- `SectionNav` no longer uses `menuItemClass`, so it is independent of the shell restyle.
- Guessed: the on-blue look of `TagInput` and `NativeSelect` is not done (nothing needs it yet).
- Guessed: the required star reuses the star icon at 12px.
