import { shellMessages } from "../shell/messages";
import { PlaceholderPage } from "./PlaceholderPage";
import { useOrgName } from "./useOrgName";

// Still a placeholder: the dataset form is not on this branch yet. When it lands, render
// <DatasetEditor orgId datasetId renderForm={(props) => <DatasetForm {...props} />} /> here
// (ids from useDatasetRoute). The editor already loads, saves with the version and handles 409.
export function DatasetEditPage() {
  const orgName = useOrgName();
  return (
    <PlaceholderPage eyebrow={orgName} {...shellMessages.pages.datasetEdit} />
  );
}
