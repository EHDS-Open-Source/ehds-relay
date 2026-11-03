import { PageHeader } from "@ehds-relay/ui";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useState } from "react";

import { api } from "../api";
import { DatasetForm, type SaveFeedback } from "../datasets/DatasetForm";
import { fromMetadata } from "../datasets/formValues";
import {
  datasetQueryKey,
  useDatasetSave,
  type DatasetDTO,
  type DatasetSaveInput,
} from "../datasets/useDatasetSave";
import { shellMessages } from "../shell/messages";
import { useOrgName } from "./useOrgName";

const route = "/orgs/$orgId/datasets/$datasetId/edit";

export function DatasetEditPage() {
  const orgName = useOrgName();
  const { orgId, datasetId } = useParams({ from: route });
  const query = useQuery({
    queryKey: datasetQueryKey(orgId, datasetId),
    queryFn: async () => {
      const { data, error } = await api.GET(
        "/api/v1/organisations/{org_id}/datasets/{dataset_id}",
        { params: { path: { org_id: orgId, dataset_id: datasetId } } },
      );
      if (!data) throw new Error(JSON.stringify(error));
      return data;
    },
  });

  return (
    <>
      <PageHeader
        eyebrow={orgName}
        title={shellMessages.pages.datasetEdit.title}
      />
      {query.data ? (
        <EditForm orgId={orgId} dataset={query.data} />
      ) : (
        <p role="status">
          {query.isError
            ? shellMessages.datasetForm.loadFailed
            : shellMessages.datasetForm.loading}
        </p>
      )}
    </>
  );
}

function EditForm({ orgId, dataset }: { orgId: string; dataset: DatasetDTO }) {
  const { saved } = useSearch({ from: route });
  const navigate = useNavigate();
  // Saves use the latest version from the cache, which each save updates
  const save = useDatasetSave(orgId, dataset);
  // Fill the form once; later cache updates (after a save) must not reset what is typed
  const [initialValues] = useState(() => fromMetadata(dataset.metadata));
  const [initialFeedback] = useState<SaveFeedback | undefined>(() => {
    if (saved === "draft") return { type: "draft" };
    if (saved === "incomplete") {
      return { type: "incomplete", missing: dataset.missing_for_publish };
    }
    return undefined;
  });

  async function onSubmit(input: DatasetSaveInput) {
    const result = await save(input);
    if (result.kind === "saved" && result.dataset.status === "published") {
      await navigate({
        to: "/orgs/$orgId/datasets/$datasetId",
        params: { orgId, datasetId: dataset.id },
      });
    }
    return result;
  }

  return (
    <DatasetForm
      initialValues={initialValues}
      initialFeedback={initialFeedback}
      onSubmit={onSubmit}
    />
  );
}
