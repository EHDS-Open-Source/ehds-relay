# Handover: sign-in and organisation screens

- `BareLayout` now draws a white page with a placeholder ring of stars (16 palette stars, turns once per 140 s, still under reduced motion). Swap in the supplied artwork in `StarRing`.
- New `BrandCard` (blue card, 28px radius, 22px on phones) holds the logo, title, text and form. `BareLayout` takes `title`/`description` to use it.
- Sign-in, organisation picker, new organisation, sign-out hint and invitation screens sit on the card. Fields use the on-blue Input/Field; `NativeSelect` gained `tone="onBlue"` (underline, white chevron).
- New organisation: errors clear on typing and focus moves to the first invalid field; the button shows the loading star while busy.
- No "Forgot your password" hint existed in the web app; none added (password reset stays with Keycloak).
- Logo is still the placeholder in `shell/Logo.tsx`.
