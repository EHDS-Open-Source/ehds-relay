import { shellMessages } from "../shell/messages";
import { PlaceholderPage } from "./PlaceholderPage";
import { useOrgName } from "./useOrgName";

export function MembersPage() {
  const orgName = useOrgName();
  return <PlaceholderPage eyebrow={orgName} {...shellMessages.pages.members} />;
}
