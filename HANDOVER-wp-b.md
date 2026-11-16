# Handover: phone tweaks for catalogue, record and export

What changed (all for phones, up to 768px; desktop is unchanged):
- Long words and URLs in titles, descriptions, eyebrow lines and catalogue cards now break instead of widening the page (`overflow-wrap: anywhere`). The title's last word and star stay together, but a word too long for the screen wraps.
- Catalogue: filter chips and the Overdue chip share one wrapping row; chips have a 44px hit area; cards use 24px padding on phones (32px on desktop).
- Ribbon: full width on phones with content 20px from the edge (desktop keeps the 96% frame). "Set next date" stays on its own line under the text.
- Export: the code panel is at most 60% of the screen height on phones (600px on desktop) and still scrolls sideways inside; the format tabs have a 44px hit area. `hitArea` is now exported from the ui package.
- Reminder dialog: buttons stack full width with Save on top, then Clear reminder, then Cancel; the dialog scrolls inside on short screens.

Not changed on purpose: inline text links in record values (term lists, e-mail addresses, URLs) keep their text height; stretching them to 44px would make neighbouring lines overlap.

Not done: no new e2e spec. The phone and landscape Playwright projects only run `mobile.spec.ts`, so a separate file would not be picked up there.
