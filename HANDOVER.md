# Handover: catalogue restyle

- Dataset card: 32px padding, palette star by position in the whole catalogue (stays put while filtering), blue title (level 2 heading), 4-line description clamp, 3px blue ring on hover and focus through the card-hover shadow token, real link. Reminder or overdue shows a footer band with a calendar icon; screen readers hear "Revalidation due" before the date, overdue says "Overdue" in words. The old Draft/Overdue chips are gone except Draft.
- Grid, filter pills (outline, active filled blue), search field with the icon on the right.
- Catalogue page: "Add a dataset" large primary with a plus circle; loading star with a message; empty state (no search or filters shown) and a no-match state that quotes the search and returns focus to the search field when cleared.
- No stats strip (a separate item). Single-step dataset form unchanged.
- `readCatalogueFields(dataset, index)` now also returns `index` and `reminderDate`.
