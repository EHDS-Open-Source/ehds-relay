# Handover: brand assets

Supplied artwork is now in the app. Everything icon-related lives in `frontend/packages/ui/src/icons/glyphs.tsx`.

## What changed
- Icons: the drawn stand-ins are replaced by the supplied solid artwork. Each glyph is a `<g fill="currentColor">` whose transform fits its original size into the 24 x 24 box by the longest side, so `Icon` (names, size scale, `aria-hidden` behaviour) is unchanged. Cut-outs (eye pupil, tag hole, file plus, info and warning marks) are real holes (even-odd), so they show what is behind the icon.
- New icon names: `calendarUpdate` (the supplied "update" calendar), `calendarAlert` and `calendarTick` (used by the reminder ribbon, replacing the stroked marks it drew over `calendar`).
- `calendar` is now the filled calendar with a plus cut out. `chevronDown` is the supplied dropdown chevron.
- Logo: `web/src/shell/Logo.tsx` is the inline SVG logo (white lettering, yellow asterisk), accessible name "EHDS Relay".
- Favicons: `web/public/favicon-32.png` and `favicon-64.png`, linked from `web/index.html`. There is no SVG favicon in the supplied set.
- Sign-in ring: `web/public/stars.svg` (neutral yellow stars at varying strength), drawn by `BareLayout` as an image. Still turns once per 140s and stops under reduced motion.

## Still drawn stand-ins (no supplied artwork)
- `more` (three dots): the set has no overflow icon.

## Notes
- The supplied "drawn" icons (eye, tag, file, person, pin, account, org chart, switch, log out, eraser, sign in, lock, plus, close, menu, tick, info, warning) were taken from the mockup, not from separate files; the mockup draws some in two colours, which are single-colour here.
- Icon placement (label before or after the icon) is untouched.
