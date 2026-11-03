# Handover: dataset detail, export and edit

## Status
Detail page, delete, export page, queries and shared `ui` pieces are done and tested.
The edit page is not wired yet: the dataset form was not pushed when this was written.

## Done
- Backend: `DatasetDTO.metadata` is typed as `DatasetMetadata`; client regenerated
  (`make api_client` leaves no diff). Dataset and OpenAPI tests pass.
- `ui`: tabs, alert dialog, badge, `CodeBlock` (Copy), `ConfirmDialog`, `StatusBadge`,
  `DetailSection`, `DetailField`, with default text in `ui/src/messages.ts`.
- `web/src/datasets/`: `fields.ts` (sections, labels, `fieldAnchor`, `missingFieldLabel`),
  `queries.ts` (`datasetKeys`, `useDataset`, `useUpdateDataset`, `useDeleteDataset`,
  `useDatasetExport`, `ApiError`), `download.ts`, `DatasetRecord.tsx`, `MissingFields.tsx`,
  `DatasetEditor.tsx` (load, `PUT` with version, 409 message with Reload, tested with a fake form).
- Pages: detail (facts, sections, draft checklist, Owner-only Delete with confirmation),
  export (three tabs kept in `?format=`, Copy, Download, missing list for incomplete records,
  "not available yet" on 501). A comment marks where the validation result will go.

## Next
- Edit page: once the dataset form exists, render
  `<DatasetEditor orgId datasetId renderForm={(p) => <DatasetForm {...p} />} />` in
  `pages/DatasetEditPage.tsx` (ids from `useDatasetRoute`). The form needs props
  `initialValues`, `onSubmit({ metadata, publish })`, and `submitting`, and field ids `field-<key>`.
  After a save the editor goes to the record.
- Add a page test for the edit route, and check the checklist links land on the right input.
- Manual browser check (Tilt) is not done. The stub session org id `demo` is not a UUID, so the
  real API refuses it until real sign-in lands.
- Export text and the validation panel wait for the real export route.

## Shared files touched (small, additive)
`web/src/shell/messages.ts` (a `loading` key and a `datasets` block), `web/src/router/routes.ts`
(`validateSearch` on the export route), `web/src/router/routes.test.tsx` (the detail placeholder
row removed), `ui/src/index.ts`, `ui/src/messages.ts`, generated API client files.
