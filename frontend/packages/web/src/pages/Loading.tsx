import { LoadingStar } from "@ehds-relay/ui";

import { BareLayout } from "../shell/BareLayout";
import { shellMessages } from "../shell/messages";

/** Shown while the session or a page is loading and it takes a moment. */
export function Loading() {
  return (
    <BareLayout>
      <LoadingStar size="page" message={shellMessages.loading} />
    </BareLayout>
  );
}
