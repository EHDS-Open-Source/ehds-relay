import { Button, PageHeader } from "@ehds-relay/ui";
import { useRouter, useSearch } from "@tanstack/react-router";

import { safeRedirect } from "../router/safeRedirect";
import { useSessionStore } from "../session/useSession";
import { BareLayout } from "../shell/BareLayout";
import { shellMessages } from "../shell/messages";

export function SignInPage() {
  const { redirect } = useSearch({ from: "/sign-in" });
  const store = useSessionStore();
  const router = useRouter();

  return (
    <BareLayout>
      <PageHeader
        title={shellMessages.signIn.title}
        description={shellMessages.signIn.description}
      />
      <div>
        <Button
          onClick={() => {
            store.signIn();
            router.history.push(safeRedirect(redirect));
          }}
        >
          {shellMessages.signIn.continue}
        </Button>
      </div>
    </BareLayout>
  );
}
