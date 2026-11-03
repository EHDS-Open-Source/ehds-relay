import { PageHeader } from "@ehds-relay/ui";
import { useNavigate, useParams } from "@tanstack/react-router";

import { DatasetForm } from "../datasets/DatasetForm";
import {
  useDatasetSave,
  type DatasetSaveInput,
} from "../datasets/useDatasetSave";
import { shellMessages } from "../shell/messages";
import { useOrgName } from "./useOrgName";

export function DatasetNewPage() {
  const orgName = useOrgName();
  const { orgId } = useParams({ from: "/orgs/$orgId/datasets/new" });
  const navigate = useNavigate();
  const save = useDatasetSave(orgId);

  async function onSubmit(input: DatasetSaveInput) {
    const result = await save(input);
    if (result.kind === "saved") {
      const datasetId = result.dataset.id;
      // From now on every save is an update of this dataset, so continue on its edit page
      if (result.dataset.status === "published") {
        await navigate({
          to: "/orgs/$orgId/datasets/$datasetId",
          params: { orgId, datasetId },
        });
      } else {
        await navigate({
          to: "/orgs/$orgId/datasets/$datasetId/edit",
          params: { orgId, datasetId },
          search: { saved: input.publish ? "incomplete" : "draft" },
          replace: true,
        });
      }
    }
    return result;
  }

  return (
    <>
      <PageHeader
        eyebrow={orgName}
        title={shellMessages.pages.datasetNew.title}
      />
      <DatasetForm onSubmit={onSubmit} />
    </>
  );
}
