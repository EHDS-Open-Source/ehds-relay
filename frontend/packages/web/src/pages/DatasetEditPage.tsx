import { PageHeader } from "@ehds-relay/ui";
import { useSearch } from "@tanstack/react-router";

import { DatasetEditor } from "../datasets/DatasetEditor";
import { DatasetForm } from "../datasets/DatasetForm";
import { useDatasetRoute } from "../datasets/useDatasetRoute";
import { shellMessages } from "../shell/messages";
import { useOrgName } from "./useOrgName";

export function DatasetEditPage() {
  const orgName = useOrgName();
  const { orgId, datasetId } = useDatasetRoute();
  const { saved } = useSearch({
    from: "/orgs/$orgId/datasets/$datasetId/edit",
  });

  return (
    <>
      <PageHeader
        eyebrow={orgName}
        title={shellMessages.pages.datasetEdit.title}
      />
      <DatasetEditor
        // A new dataset (after the add page's first save) starts a fresh editor
        key={datasetId}
        orgId={orgId}
        datasetId={datasetId}
        saved={saved}
        renderForm={(props) => <DatasetForm {...props} />}
      />
    </>
  );
}
