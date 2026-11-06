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

  async function onSubmit(
    input: DatasetSaveInput,
    { leaving = false }: { leaving?: boolean } = {},
  ) {
    const result = await save(input);
    // Saving on the way out goes where the user chose; the form just saved, so the moves
    // below must not be held back by its leave guard
    if (result.kind === "saved" && !leaving) {
      const datasetId = result.dataset.id;
      // From now on every save is an update of this dataset, so continue on its edit page
      if (result.dataset.status === "published") {
        await navigate({
          to: "/orgs/$orgId/datasets/$datasetId",
          params: { orgId, datasetId },
          ignoreBlocker: true,
        });
      } else {
        await navigate({
          to: "/orgs/$orgId/datasets/$datasetId/edit",
          params: { orgId, datasetId },
          search: { saved: input.publish ? "incomplete" : "draft" },
          replace: true,
          ignoreBlocker: true,
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
