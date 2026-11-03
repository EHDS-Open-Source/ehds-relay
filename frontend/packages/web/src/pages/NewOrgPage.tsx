import { BareLayout } from "../shell/BareLayout";
import { shellMessages } from "../shell/messages";
import { PlaceholderPage } from "./PlaceholderPage";

export function NewOrgPage() {
  return (
    <BareLayout>
      <PlaceholderPage {...shellMessages.newOrg} />
    </BareLayout>
  );
}
