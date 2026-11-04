# Handover: global tokens and base layer

## What changed
- `frontend/packages/ui/src/styles.css`
  - `--spacing: 4px` in `@theme inline`. Tailwind spacing and size utilities are now real pixels, even with the 15px root (`p-8` is 32px, `h-10` is 40px, `size-11` is 44px).
  - The radius and shadow scales are cleared. Only these exist: `rounded-card` (14px), `rounded-field` (12px), `rounded-modal` (24px), `rounded-signin` (28px), `shadow-card`, `shadow-card-hover` and `shadow-overlay`. `rounded-lg`, `shadow-md` and the rest no longer generate any CSS.
  - The `--color-card` utility is removed so it no longer clashes with `shadow-card`.
  - `--shadow-section` is now `drop-shadow(...)` and is applied with `filter-(--shadow-section)` on the record section.
  - New tokens: `--scrim` (`bg-scrim`) and `--error-on-white-shade` (#9C0064). `--warning-bg` is #FCEEE2.
  - Default transition duration and easing use `--motion-fast` and `--ease-standard`.
  - The `md` breakpoint is 769px, so 768px and narrower is the phone layout. Nothing in the JS depended on 768.
  - Reduced motion stops all animations, transitions and smooth scrolling, except the loading star, which pulses.
  - The brand `:root` layer is now the last block in the file.
- `cn()` uses a tailwind-merge config that knows the brand radii and shadows. `scrollBehavior()` returns `auto` when reduced motion is on; `SectionNav`, `focus.ts` and `DatasetForm` use it.
- Components:
  - Buttons: 34, 40, 46 and 50px; icon buttons 44px. The default button gap is 12px.
  - Boxed inputs and selects are 51px tall with 12px/16px padding.
  - Tag box: 12px radius.
  - Cards: 32px padding, 56px at the bottom.
  - Record: section tab and table cells have 16px/24px padding; sections are 48px apart (40px on phones).
  - Dialogs: 32px padding, no border, overlay shadow and scrim.
  - Dropdown: overlay shadow, 12px radius, 8px padding, fade only.
  - Member rows, invitation rows and account cards: card shadow, no border.
  - Wrapper padding: 64px 40px (40px 20px on phones).
  - Header: 64px tall on phones. Desktop padding is `2% + var(--space-40)`.
  - Sign-in card: 56px/64px padding (40px/24px on phones, radius switch at `md`).
  - Hints use `text-blue-hint`. The radio dot is drawn with `::before`.
- Guard tests in `ui/src/theme.test.ts` compile the theme with Tailwind. They check:
  - 4px spacing.
  - The shadow utilities exist and the default radii and shadows are gone.
  - The brand layer comes last.
  - The reduced-motion rule.
  - Source files contain no default radius or shadow classes, no `duration-150` and no hard-coded smooth scrolling.

## Judgement calls
- Wrapper padding follows the mockup (64/40, 40/20 on phones) rather than the written 2.5rem and 36px/1.25rem. 40px lines up with the header's `2% + 40px`.
- The warning panel (`MissingList`) lost its shadow. The guide only allows shadows on cards, rows and the account card.
- Dropdown items got the guide's 12px/16px padding and 8px corners. Code blocks on the record use the 18px code radius.

## Left for later packages
- Header actions, catalogue layout, the card band, the record table layout, form behaviour, dialog focus, screens, invite form alignment and member role tags.
- Font sizes (`text-sm`, `text-xs` and others still use rem) are untouched.
