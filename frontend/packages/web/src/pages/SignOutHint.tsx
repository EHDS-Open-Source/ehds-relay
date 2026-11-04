import { useSession, useSignOut } from "../session/useSession";
import { shellMessages } from "../shell/messages";

/** "Not you? Sign out" for screens that have no menu. Sits on the blue card. */
export function SignOutHint({ lead }: { lead: string }) {
  const user = useSession()?.user;
  const signOut = useSignOut();
  return (
    <p className="mt-8 text-sm text-white">
      {user ? `${user.email}. ` : null}
      {lead}{" "}
      <button
        type="button"
        className="font-semibold text-yellow underline-offset-4 hover:underline"
        onClick={() => {
          void signOut();
        }}
      >
        {shellMessages.signOut}
      </button>
    </p>
  );
}
