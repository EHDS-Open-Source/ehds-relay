# Handover: dataset record and export restyle

## What changed

- `DetailSection` / `DetailField` (ui): one-column table, label stacked above the value (8px
  gap, 0.78em uppercase blue 400, 0.06em tracking), value 1.02em/600 ink, `long` prop for
  running text (400, line height 1.7), grey dash for empty values, 1px #F3F4FD rules drawn by
  a 1px grid gap, cells 16px 24px, tab 16px 24px at 1.1em/700, section 48px apart (40px on
  phones), capped at 1280px, `drop-shadow` filter on the section. `labelHidden` keeps a label
  for screen readers only.
- `DetailPill`: 34px, 14px icon, padding 0 16 0 12, 0.85em/600 blue on #E8EAFB. New
  `KeywordPill` for keywords.
- `PageHeader`: the last word of the title and the adornment are wrapped together in a
  `white-space: nowrap` span (`data-slot="title-tail"`); new `variant="record"` (1.15em context
  line, title max 34ch and 1.85em on phones, 24px to the description, 48px gap to the actions)
  and a `children` slot under the description. All page titles now carry the design's
  -0.015em letter spacing.
- `Ribbon`: `label` (regular weight on the normal strip) plus the date as children, min height
  56px on the inner row so content is centred, overdue all bold with a 0.9em/500 help line and
  the action wrapped under the text on phones.
- `CodeBlock`: `formatLabel` (media type in sentence case, Poppins 600 yellow), 13px/1.7 code,
  20px padding, 600px max height, `CodeBlockButton` outline in `--code-control`, optional
  `attached` (square top-left corner, not used: the export tabs sit apart from the panel as in
  the design).
- Record page: reading groups Description / Access, legal and content / Variables / Keyword,
  then the QUANTUM label (as a code panel). Title and description rows appear in the table only
  when there are translations. Pills: access level, health data category, geography, records
  and people in words (Intl compact long). Status, last changed, last validated and who set the
  reminder are on a quiet line under the pills. Set reminder (calendar plus, or the update
  calendar once set) and Edit with icons after the label; View output and Delete (bin after the
  label) are 34px secondary buttons under them in the actions group. Phones: Set reminder and
  Edit full width, stacked. The overdue pill, the overdue paragraph and the reminder pill are
  gone; overdue shows only in the ribbon. Overdue = reminder date strictly before today, or the
  API's `overdue` flag (then the ribbon says "Revalidation overdue" with the existing hint).
- Export page: segmented pill tabs ("Turtle (TTL)", "JSON-LD", "RDF/XML"), media type labels,
  official checks restyled as a white card with the card shadow.

## Measured against the design (1280 / 390)

Matches: context line 17.25px/27.6, title 33px/37.95 (27.75px on phones), star 21.8px glued to
the last word, pills 34px with 14px icons and 12px gaps (8px on phones), Set reminder 46px with
padding 0 12 0 24 and 24px icon after the label, Edit 46px padding 0 20 gap 16 with 18px icon
after, ribbon 56px (63px overdue at 1280), tab 149x53.4 for "Description", cells 16/24, label
11.7px with 0.702px tracking, value 15.3px/600, long 400/1.7, keywords 34px, section gap 48/40,
export tabs 314x48 with 113x36 active pill, code panel radius 18, header 55px, label 11px yellow,
buttons 34px with 35% white border, code 13px/22.1. No horizontal scroll on any screen.

## Left / notes

- The record's quiet meta line and the small View output / Delete row have no equivalent in the
  design; they keep information the design does not show.
- The main area's top padding is 64px; the record page pulls itself up 8px (16px on phones) to
  match the design's hero spacing rather than changing the shared layout.
- The ribbon content follows the app's 96% frame, so on phones it starts at 27.8px like the
  page content (the design's ribbon uses 20px).
