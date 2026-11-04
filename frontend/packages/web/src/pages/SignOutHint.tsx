import { useSession, useSignOut } from "../session/useSession";
import { BelowCard, belowCardLinkClass } from "../shell/BareLayout";
import { shellMessages } from "../shell/messages";

/**
 * "<email>. Not you? Sign out" for screens that have no menu. Goes under the blue card, on
 * white (pass it as the layout's `below`).
 */
export function SignOutHint({ lead }: { lead: string }) {
  const user = useSession()?.user;
  const signOut = useSignOut();
  return (
    <BelowCard>
      {user ? (
        <span className="font-normal break-words">{`${user.email}. `}</span>
      ) : null}
      {lead}{" "}
      <button
        type="button"
        className={belowCardLinkClass}
        onClick={() => {
          void signOut();
        }}
      >
        {shellMessages.signOut}
      </button>
    </BelowCard>
  );
}
