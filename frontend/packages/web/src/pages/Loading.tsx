import { BareLayout } from "../shell/BareLayout";
import { shellMessages } from "../shell/messages";

/** Shown while the session or a page is loading and it takes a moment. */
export function Loading() {
  return (
    <BareLayout>
      <p role="status" className="text-muted-foreground">
        {shellMessages.loading}
      </p>
    </BareLayout>
  );
}
