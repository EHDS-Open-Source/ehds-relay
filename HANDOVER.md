# Handover: tag input limits

Status: implemented, checks pass (frontend lint, format, types; ui and web vitest).

Done
- TagInput takes optional maxLength and maxTags: typing and pasting are capped, messages are
  announced in the status line, the full placeholder shows at the maximum, the box stays
  enabled and keeps refused text.
- Keywords only use the limits (read from the generated schema in web/src/datasets/tagLimits.ts).
- Over-limit keyword issues (client schema and server 422) are folded onto the Keywords field
  by foldTagIssue in web/src/datasets/validate.ts.
- Tags are keyed by position, so tests that remove several tags must look buttons up again.

Next (manual, in Tilt)
- Type 51 characters; paste 25 keywords; at 20, Enter keeps the text; Backspace still removes.
- Open a dataset with 21 keywords: error on Keywords, saves once trimmed.

Commands
- cd frontend && make check
- cd frontend/packages/ui && pnpm exec vitest run src/form/TagInput.test.tsx
- cd frontend/packages/web && pnpm exec vitest run src/datasets
