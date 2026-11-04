# Handover: entry screens restyle

Branch `T-055-fix7-entry`, cut from `mvp-integration`.

## Done
- On-blue fields (`Input`, `NativeSelect`, `Field` with `tone="onBlue"`): bold yellow typed text
  at 1.05em, placeholder white 75% (500), 2px white line turning yellow on focus (no outline, the
  line is the focus), 3px pink line when invalid that stays pink on focus, autofill rule in
  `ui/src/styles.css` (inset shadow, the one allowed exception), empty select shown as a
  placeholder, yellow chevron 4px from the edge. Labels 1.05em with 4px to the field, errors 12px
  under it. White-surface fields unchanged.
- `BrandCard`: 520px (`width="wide"` 620px), padding 56/64 (40/24 on phones), radius 28 (22 at
  768px and below), title 2.15em / 1.2 (1.75em on phones), logo 40px above (24px on phones),
  description 1.1em / 1.6, content 40px under it.
- `BareLayout`: `below` slot for lines on white under the card (`BelowCard`,
  `belowCardLinkClass`: blue 600, underline only on hover); phones start at the top with 24/16
  padding. Star ring 88.5vw (min 1100px), as in the design.
- Sign-in, picker, new organisation and invitation screens: large buttons with the icon after the
  label (`shell/cardButton.ts`: 24px padding and gap, full width at 768px and below), copy from
  the design, picker rows as whole links with a rule under every row.

## Decisions and guesses
- "email. Not you? Sign out" sits under the card on white on the picker and the new organisation
  page, as asked, although the design draws it inside the picker card.
- Picker row hover follows the design: the rule turns yellow and the arrow circle white (not a
  darker yellow).
- Picker arrow drawn at 16px so it looks like the design's arrow (its 24px box holds a smaller
  arrow); pins 20px.
- Invitation buttons: Go to my organisations (arrow), Sign in (sign-in), Create an account (plus),
  Accept invitation (tick), Sign out (log out icon).
- New organisation has no section headings or payment fields: name and country only.

## Left
- Required star sits 0.25em from the label; the design also has a space before it (about 4px
  more). It is the shared `Field`, so not changed here.
- Error star in on-blue messages is 18px; the design draws 20px.
