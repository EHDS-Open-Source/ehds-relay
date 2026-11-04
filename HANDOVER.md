# Handover: web UI restyle, foundation step

Status: foundation done and pushed on this branch. Nothing else started.

## Done
- Brand tokens, shadcn variable mapping, light-only theme, 15px base, Poppins (self-hosted
  with `@fontsource/poppins`), global 3px focus outline, reduced-motion rules, star keyframes
  in `frontend/packages/ui/src/styles.css`.
- `ui/src/icons/` (Icon plus drawn stand-in glyphs, one module), `ui/src/brand/starPalette.ts`,
  `ui/src/feedback/LoadingStar.tsx`.
- Button types (primary, secondary, row, icon, destructive), four sizes, `busy`, `onBlue`;
  old variant names (`default`, `outline`, `ghost`, `link`) still work as aliases.
- Restyled input, textarea, native select, label, badge, form message, tabs.
- Tests: busy button, icons, star palette, loading star, a guard against dark-mode styles.

## Next
- Shell and page frame, feedback components and form controls can now start in parallel
  (each in its own worktree off this branch once merged).
- Old button variant aliases can go once screens move to the new names.

## Check it
    make -C frontend check test build
    make web   # then look at http://localhost:5173

## Notes
- Default size is now 40px high and the primary button is yellow with blue text, so every
  existing screen changes colour. Row, size and wording changes come with the screen steps.
- Icons and the favicon are drawn placeholders until the brand files arrive; swap them in
  `ui/src/icons/glyphs.tsx` and `web/index.html`.

## Link fix
- Inline links on white are now blue, 600, dotted underline (solid on hover); on blue
  surfaces (`data-surface="blue"`) they are yellow. Bare `<a>` get this from the base layer;
  anchors with classes use the `link` class. Guarded by a test in `ui/src/theme.test.ts`.
