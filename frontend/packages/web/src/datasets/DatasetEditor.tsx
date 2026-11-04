import { Button, ConfirmDialog, EmptyState } from "@ehds-relay/ui";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import { shellMessages } from "../shell/messages";
import type { SaveFeedback } from "./DatasetForm";
import { focusAnchor } from "./focus";
import { fromMetadata, type DatasetFormValues } from "./formValues";
import { errorStatus, useDataset, type Dataset } from "./queries";
import {
  useDatasetSave,
  type DatasetSaveInput,
  type SaveResult,
} from "./useDatasetSave";

const m = shellMessages.datasets;

/** What the edit page arrived with: `?saved=` after the first save on the add page. */
export type SavedOnArrival = "draft" | "incomplete";

/** What the editor gives the dataset form (the `DatasetForm` props). */
export interface DatasetFormRenderProps {
  initialValues: DatasetFormValues;
  initialFeedback?: SaveFeedback;
  onSubmit: (input: DatasetSaveInput) => Promise<SaveResult>;
}

function arrivalFeedback(
  saved: SavedOnArrival | undefined,
  dataset: Dataset,
): SaveFeedback | undefined {
  if (saved === "draft") return { type: "draft" };
  if (saved === "incomplete") {
    return { type: "incomplete", missing: dataset.missing_for_publish };
  }
  return undefined;
}

/**
 * Loads a dataset and shows the form filled with it. Saves go through `useDatasetSave` (a PUT
 * with the version that was read), so the add and edit pages share one save path. A stale
 * version (409) offers a Reload; a published dataset opens its record, a draft stays here with
 * the form's own feedback. A `#field-<key>` in the address focuses that field once loaded.
 */
export function DatasetEditor({
  orgId,
  datasetId,
  saved,
  renderForm,
}: {
  orgId: string;
  datasetId: string;
  saved?: SavedOnArrival;
  renderForm: (props: DatasetFormRenderProps) => ReactNode;
}) {
  const query = useDataset(orgId, datasetId);

  if (query.isPending) {
    return (
      <p role="status" className="text-muted-foreground">
        {shellMessages.loading}
      </p>
    );
  }
  if (query.isError) {
    const notFound = errorStatus(query.error) === 404;
    return (
      <EmptyState
        title={notFound ? m.notFound.title : m.loadFailed}
        description={notFound ? m.notFound.description : undefined}
      />
    );
  }
  return (
    <LoadedEditor
      orgId={orgId}
      dataset={query.data}
      saved={saved}
      refetch={query.refetch}
      renderForm={renderForm}
    />
  );
}

function LoadedEditor({
  orgId,
  dataset,
  saved,
  refetch,
  renderForm,
}: {
  orgId: string;
  dataset: Dataset;
  saved?: SavedOnArrival;
  refetch: () => Promise<unknown>;
  renderForm: (props: DatasetFormRenderProps) => ReactNode;
}) {
  // Saves read the latest version from the cache, which every save updates
  const save = useDatasetSave(orgId, dataset);
  const navigate = useNavigate();
  const hash = useLocation({
    select: (location) => location.hash.replace(/^#/, ""),
  });
  const [problem, setProblem] = useState<"conflict" | number | null>(null);
  const [confirmingReload, setConfirmingReload] = useState(false);
  // The form takes its values once; a new key (after Reload) starts it again from the saved ones
  const [formKey, setFormKey] = useState(0);
  const [formProps, setFormProps] = useState(() => ({
    initialValues: fromMetadata(dataset.metadata),
    initialFeedback: arrivalFeedback(saved, dataset),
  }));

  // A link such as the record's missing-field list lands on its field
  useEffect(() => {
    if (hash.startsWith("field-")) focusAnchor(hash);
  }, [hash, formKey]);

  async function onSubmit(input: DatasetSaveInput): Promise<SaveResult> {
    setProblem(null);
    const result = await save(input);
    if (result.kind === "conflict") setProblem("conflict");
    if (result.kind === "failed" && result.status === 403) setProblem(403);
    if (result.kind === "saved" && result.dataset.status === "published") {
      await navigate({
        to: "/orgs/$orgId/datasets/$datasetId",
        params: { orgId, datasetId: dataset.id },
      });
    }
    return result;
  }

  async function reload() {
    const fresh = (await refetch()) as { data?: Dataset };
    const latest = fresh.data ?? dataset;
    setFormProps({
      initialValues: fromMetadata(latest.metadata),
      initialFeedback: undefined,
    });
    setProblem(null);
    setFormKey((k) => k + 1);
    setConfirmingReload(false);
  }

  return (
    <>
      {problem === "conflict" ? (
        <div
          role="alert"
          className="mb-6 rounded-card border border-destructive/50 bg-destructive/5 p-4"
        >
          <p className="font-medium">{m.save.conflictTitle}</p>
          <p className="mt-1 mb-3 text-sm">{m.save.conflictBody}</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setConfirmingReload(true);
            }}
          >
            {m.save.reload}
          </Button>
        </div>
      ) : problem === 403 ? (
        <p role="alert" className="mb-6 text-destructive">
          {m.save.forbidden}
        </p>
      ) : null}
      <div key={formKey}>{renderForm({ ...formProps, onSubmit })}</div>
      <ConfirmDialog
        open={confirmingReload}
        onOpenChange={setConfirmingReload}
        title={m.save.conflictTitle}
        description={m.save.reloadConfirm}
        confirmLabel={m.save.reload}
        onConfirm={() => void reload()}
      />
    </>
  );
}
