# Handover: dataset record and output restyle

- Record page: "Dataset Record" context line, palette star after the title, detail pills,
  Set reminder (primary) and Edit (secondary). Delete is a secondary button that opens the
  confirm dialog, then shows a toast.
- Revalidation ribbon: `ui/src/layout/Ribbon.tsx`. The record page shows it in the shell's
  ribbon slot through a portal (`web/src/shell/RibbonSlot.tsx`, wired in `OrgLayout`).
  Yellow once the reminder date has passed.
- Star colour: position in the cached catalogue list, else a hash of the id. If the
  catalogue card uses a different index (for example after filtering), align the two.
- Section tables, status badge, code block (navy) restyled. `DetailField` no longer takes
  `wide`; empty values show a dash.
- The ribbon icons (ticked and alert calendar) are drawn inside `Ribbon.tsx`, not in the icon set.
- `datasetTestUtils.renderApp` now mounts `ToastProvider`; use `findAlert()` for alerts, since
  the toast area keeps an empty alert region.
- Not done: keeping the star and the last title word from wrapping apart (needs a
  `PageHeader` change); no pills for record counts.
