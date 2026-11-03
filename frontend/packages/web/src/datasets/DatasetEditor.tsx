import { Button, ConfirmDialog, EmptyState } from "@ehds-relay/ui";
import { useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";

import { shellMessages } from "../shell/messages";
import type { DatasetMetadata } from "./fields";
import { errorStatus, useDataset, useUpdateDataset } from "./queries";

const m = shellMessages.datasets;

/** What the dataset form hands back when the user saves. */
export interface DatasetFormSubmit {
  metadata: DatasetMetadata;
  /** True for Save and Publish, false for Save draft. */
  publish: boolean;
}

/** What the editor gives the dataset form. */
export interface DatasetFormRenderProps {
  initialValues: DatasetMetadata;
  onSubmit: (values: DatasetFormSubmit) => void;
  submitting: boolean;
}

function saveErrorMessage(error: unknown): string {
  return errorStatus(error) === 403 ? m.save.forbidden : m.save.failed;
}

/**
 * Loads a dataset, shows the form filled with it and saves with `PUT` and the version that was
 * read. The form itself is passed in, so this does not depend on how it is built.
 */
export function DatasetEditor({
  orgId,
  datasetId,
  renderForm,
}: {
  orgId: string;
  datasetId: string;
  renderForm: (props: DatasetFormRenderProps) => ReactNode;
}) {
  const query = useDataset(orgId, datasetId);
  const save = useUpdateDataset(orgId, datasetId);
  const navigate = useNavigate();
  const [confirmingReload, setConfirmingReload] = useState(false);
  // Bumped on reload so the form starts again from the saved values
  const [formKey, setFormKey] = useState(0);

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

  const dataset = query.data;
  const conflict = errorStatus(save.error) === 409;

  function submit({ metadata, publish }: DatasetFormSubmit) {
    save.mutate(
      { metadata, publish, version: dataset.version },
      {
        onSuccess: () => {
          void navigate({
            to: "/orgs/$orgId/datasets/$datasetId",
            params: { orgId, datasetId },
          });
        },
      },
    );
  }

  async function reload() {
    await query.refetch();
    save.reset();
    setFormKey((k) => k + 1);
    setConfirmingReload(false);
  }

  return (
    <>
      {conflict ? (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-destructive/50 bg-destructive/5 p-4"
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
      ) : save.isError ? (
        <p role="alert" className="mb-6 text-destructive">
          {saveErrorMessage(save.error)}
        </p>
      ) : null}
      <div key={`${dataset.version}-${formKey}`}>
        {renderForm({
          initialValues: dataset.metadata,
          onSubmit: submit,
          submitting: save.isPending,
        })}
      </div>
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
