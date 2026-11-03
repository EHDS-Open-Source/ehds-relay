import { Button, EmptyState } from "@ehds-relay/ui";
import { useRouter, type ErrorComponentProps } from "@tanstack/react-router";

import { BareLayout } from "../shell/BareLayout";
import { shellMessages } from "../shell/messages";

/** Shown when something other than "not signed in" fails, e.g. the API is unreachable. */
export function ServiceError({ reset }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <BareLayout>
      <EmptyState
        title={shellMessages.serviceError.title}
        description={shellMessages.serviceError.description}
        action={
          <Button
            onClick={() => {
              reset();
              void router.invalidate();
            }}
          >
            {shellMessages.serviceError.retry}
          </Button>
        }
      />
    </BareLayout>
  );
}
