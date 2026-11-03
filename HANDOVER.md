# Handover

Status: catalogue screen built and passing `make -C frontend check` and `make -C frontend test`.

Done
- The catalogue loads the organisation's datasets with `$api` (typed TanStack Query hooks) and shows cards, a search box and access chips.
- Search and the chip live in the URL (`?q=&access=`) and filter in the browser (`pages/catalogue/filterDatasets.ts`).
- Loading, error with Retry, empty organisation and no-match states each have their own view.
- New shared pieces in `ui/src/patterns/`: SearchField, FilterChips, DatasetCard, CardGrid.
- The test fetch stub returns an empty list for dataset URLs.

Next
- Browser check against the real API once sign-in and organisations land (empty org, a few datasets, search, chips, reload, back).
- Add and edit pages should invalidate the list query key after saving (see the frontend README).

Blockers: none. Input and badge are plain Tailwind elements, not shadcn-generated.
