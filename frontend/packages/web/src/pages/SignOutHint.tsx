import { Button } from "@ehds-relay/ui";

import { useSession, useSignOut } from "../session/useSession";
import { shellMessages } from "../shell/messages";

/** "Not you? Sign out" for screens that have no menu. */
export function SignOutHint({ lead }: { lead: string }) {
  const user = useSession()?.user;
  const signOut = useSignOut();
  return (
    <p className="mt-8 text-sm text-muted-foreground">
      {user ? `${user.email}. ` : null}
      {lead}{" "}
      <Button
        variant="link"
        className="h-auto p-0"
        onClick={() => {
          void signOut();
        }}
      >
        {shellMessages.signOut}
      </Button>
    </p>
  );
}
