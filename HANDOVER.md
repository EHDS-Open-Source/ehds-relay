# Handover: dataset form

Branch `T-018-build-dataset-form`, from `mvp-integration`.

## Status
In progress. Zod generation and the form values, field map and validation are done and
tested. The form itself, its pages and its tests are being built.

## Done
- `make api_client` also writes Zod schemas (`@hey-api/openapi-ts`, zod plugin only) into
  `frontend/packages/api-client/src/generated/zod/`, exported from `@ehds-relay/api-client`
  (e.g. `zDatasetMetadata`).
- `ui`: input, textarea, label, dropdown menu and confirm dialog from shadcn; `Field`,
  `TagInput`, `RepeatableList`, `RadioChoices` and `SectionNav`.
- `web/src/datasets/formValues.ts` (`fromMetadata`, `toMetadata`), `fields.ts` (field and
  section map), `validate.ts`.

## Contract for the dataset pages
- `DatasetForm` (`web/src/datasets/DatasetForm.tsx`) takes `initialValues` (from
  `fromMetadata(dataset.metadata)`), `onSubmit({ metadata, publish })` returning a
  `SaveResult` (`useDatasetSave.ts`), and an optional `initialFeedback`.
- Field anchors are `#field-<key>` (`fieldAnchorId`), sections `#section-<id>`.
- `fields.ts` exports `datasetSections`, `fieldKeys`, `fieldLabel`, `fieldAnchorId`,
  `sectionAnchorId`, `sectionOf`.

## Next
Form tests against a simulated server, then the manual browser check once real sign-in is in.

## Blockers
None.
