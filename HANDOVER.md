# Handover: dataset form

Branch `T-018-build-dataset-form`, from `mvp-integration`.

## Status
Built and tested against a simulated dataset API. `make -C frontend check`, `test` and
`build` pass, and so do the dataset backend tests. Still to do: the manual browser check, once
real sign-in is in (the stand-in organisation id `demo` is not one the server knows).

## Done
- `make api_client` also writes Zod schemas (zod plugin of `@hey-api/openapi-ts`, pinned at
  0.99.0) into `frontend/packages/api-client/src/generated/zod/`. They are exported from
  `@ehds-relay/api-client`, e.g. `zDatasetMetadata`.
- `ui`: input, textarea, label, dropdown menu and confirm dialog from shadcn. Also `Field`,
  `TagInput`, `RepeatableList`, `RadioChoices` (native radio buttons) and `SectionNav`.
- `web/src/datasets/`: `formValues.ts` (`fromMetadata`, `toMetadata`, error path mapping),
  `fields.ts` (field and section map), `validate.ts`, `useDatasetSave.ts`, field inputs in
  `fields/`, the six sections in `sections/`, `SaveMenu`, `MissingList` and `DatasetForm`. The
  tests use `fakeServer.ts` and the backend golden examples.
- The add page (`/orgs/$orgId/datasets/new`) and edit page (`/orgs/$orgId/datasets/$datasetId/edit`,
  which accepts `?saved=draft|incomplete`) use the form.
- Backend: the QUANTUM label Turtle check is now a field validator, so a 422 names
  `metadata.quantum_label`. The API shape is unchanged.

## Contract for the dataset pages
- `DatasetForm` (`web/src/datasets/DatasetForm.tsx`) props:
  - `initialValues`: `fromMetadata(dataset.metadata)`; leave it out for an empty form.
  - `onSubmit({ metadata, publish })`: returns `Promise<SaveResult>`, which is
    `{kind: "saved", dataset}`, `{kind: "invalid", issues}` (FastAPI 422 detail),
    `{kind: "conflict"}` or `{kind: "failed"}`. The form shows the result, and the caller
    decides where to go next.
  - `initialFeedback`: optional, `{type: "draft"}` or `{type: "incomplete", missing}`.
- `useDatasetSave(orgId, dataset?)` returns such an `onSubmit`. It creates the dataset (POST)
  or updates it (PUT with `version`), puts the saved dataset in the query cache under
  `["datasets", orgId, id]` and refreshes the other `["datasets", orgId]` queries. If the
  dataset pages bring a shared `datasetKeys`, switch to it.
- Fields have the anchor `#field-<key>`. Nested parts named by `missing_for_publish` use
  dashes, e.g. `#field-publisher-contact_point`. Sections are `#section-<id>`.
- `fields.ts` exports `datasetSections`, `fieldKeys`, `FieldKey`, `SectionId`, `fieldLabel`,
  `fieldAnchorId`, `sectionAnchorId` and `sectionOf`. Labels live in
  `shellMessages.datasetForm.fields`.

## Shared files touched (additive)
`web/src/shell/messages.ts` (new `datasetForm` block), `web/src/router/routes.ts`
(`validateSearch` on the edit route), `ui/src/index.ts` and `ui/src/messages.ts` (new exports
and keys), `api-client/src/index.ts` (Zod export), `frontend/Makefile` (comment),
`api-client/package.json` (generate script), and the lockfile.

## Next
- Manual check in Tilt once sign-in is in: sections and menu, title-only draft, incomplete
  publish and its missing list, full publish, Save draft on a published dataset, keyboard-only
  use, a narrow window, and a clean console.
- The production bundle is now about 640 kB, so Vite warns about chunk size. Loading the
  dataset pages lazily would fix it.

## Blockers
None.
