# Handover: catalogue page and dataset cards

Branch note for the catalogue restyle. Remove it when the branch is merged.

## What changed

- Catalogue top area: the intro paragraph is gone (context line and title stay). Search
  (max 360px wide, 40px tall, `--line` border, "Search datasets…", 24px search icon) and the
  access chips share one toolbar row with 12px gaps and 40px below; the grid starts 316px
  from the top at 1280 wide, as in the design. On phones the search takes the full row.
- Revalidation filter: the separate "Any / Overdue only" row is now one `Overdue` toggle chip
  at the end of the toolbar (`FilterToggle` in `ui`). It only shows when a dataset is overdue
  or the filter is on (`?overdue=true` still works).
- Chips: ink text, `--line` border, white fill; hover blue border and text; active filled blue.
- Dataset card (`ui/patterns/DatasetCard.tsx`): padding 32px (56px bottom without a band),
  title 1.1em/1.3 bold blue, description 0.94em/1.6 clamped to 4 lines, 24px star 20px from
  the bottom-right corner, Draft chip kept. Keyboard focus is the 3px blue outline 4px out;
  hover keeps the blue ring.
- Reminder band: 62px min, padding 16/20/16/32, 1em/600 blue-hint text (blue on hover and
  focus), solid 20px calendar, long date, star on the right.
- Overdue band: yellow fill with no top rule, bold blue "Overdue <date>" (read out as
  "Revalidation overdue since <date>"), calendar with exclamation mark, blue star.
- Overdue on the card means the reminder date is before today (`isReminderPassed`), or the
  API `overdue` flag (published and not validated for a year, so the flag stays visible in
  the catalogue). With the flag but no passed date the band says "Overdue" without a date.
- "Add a dataset": label first, then the 34px blue circle with the yellow plus; padding
  0 8px 0 24px, gap 24px, circle inverts on hover; full width with space-between at 768px
  and below. Header row: 32px below, add button centred against the title on desktop,
  40px under the title on phones.
- Dates: `formatIsoDate` now gives the long form ("22 October 2027"); the record ribbon and
  facts use the same function.
- Focus: following a card moves focus to the next page's `h1` once it renders
  (`pages/catalogue/cardFocus.ts`); coming back to the catalogue focuses that card again.
  `PageHeader` renders its `h1` with `tabIndex={-1}` and no outline for this.
- Star colour: `datasetStarColour(id)` in `ui` (palette colour from the dataset id) is used by
  both the card and the record title, so they match on a direct load too.
- `PageHeader`: context line 1.1em/1.6 with 4px below (as on the catalogue and form in the
  design), and a `className` prop. `EmptyState`: star 20px above the title (16px compact),
  title line height 1.3, description line height 1.6.
- No-match state names the access level ("No public datasets match “zebra”"); with only a
  filter and no search it says "No public datasets yet" and to clear the filters.

## Measured against the design (1280 / 390)

Card 366.9 wide, padding 32/32/56, title 16.5px/21.45px, description 14.1px/22.56px, star
24px at 20px inset, band 62px with 16/20/16/32 padding, search 360x40 (334x40 on phones),
chips 40px, toolbar gap 12px and 40px below, grid top 316.3px, add button 212x50 with 34px
circle (334x50 on phones), empty-state button top 499.7 / 488.2: all equal to the design.
No horizontal scroll at either width.

## Open points and guesses

- Id-based star colours no longer guarantee that neighbouring cards differ (the design's
  list-position colours do). Chosen so the record matches the card on a direct load.
- The record page still treats a reminder due today as passed (`<=`); the card uses
  "before today". Align when the record page is restyled.
- On phones an extra Overdue chip can wrap onto its own row.
- The search field shows the global 3px focus outline on any focus, including mouse clicks.
