# Shell and page frame

Restyles the app frame: header, menu panel, page wrapper and page heading.

## What changed

- Header: solid blue bar, 72px tall (64px on phones), logo on the left, yellow 44px menu circle on the right. Actions wrap to a second row at 768px and below. The organisation name stays in the header for now, hidden on phones.
- Page wrapper: 96% wide, 64px by 2.5rem padding (36px by 1.25rem on phones). New `ribbon` slot between the header and the content. The skip link is now a yellow pill.
- Menu panel: blue, 400px (full width on phones), organisation name in yellow, yellow close circle, white links with yellow icons and pale dividers, a yellow "Log out" button, and a small yellow star at the bottom right. A new `footer` slot holds the API health status, which moved here from the header.
- `NavItem` has an optional `icon`; menu entries now use drawn icons. Wording: "Manage users" (menu entry) and "Log out" (menu button). The page title and the "Sign out" on the organisation picker are unchanged.
- Page heading: plain blue context line, H1 size from the heading scale, `titleAdornment` slot, wider description text.
- New placeholder wordmark in `web/src/shell/Logo.tsx`; swap it when the real logo arrives.

## Notes for later

- The account page has no menu, so it no longer shows the API health status.
- `menuItemClass` in `SideMenu.tsx` is kept (white-background look) because the in-page section menu still uses it. The blue panel uses `menuLinkClass`.
- Menu icons are placed before the label at 24px; the guide gives two sizes, so this is a guess.
