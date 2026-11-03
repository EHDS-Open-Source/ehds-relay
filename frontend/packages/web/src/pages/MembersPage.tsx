import { EmptyState, PageHeader } from "@ehds-relay/ui";
import { useParams } from "@tanstack/react-router";

import { InvitationsSection } from "../members/InvitationsSection";
import { MembersSection } from "../members/MembersSection";
import { useSession } from "../session/useSession";
import { shellMessages } from "../shell/messages";
import { useOrgName } from "./useOrgName";

/** Members and invitations of one organisation. Only owners can see or change them. */
export function MembersPage() {
  const { orgId } = useParams({ from: "/orgs/$orgId" });
  const orgName = useOrgName();
  const session = useSession();
  const role = session?.orgs.find((org) => org.id === orgId)?.role;

  return (
    <>
      <PageHeader eyebrow={orgName} {...shellMessages.pages.members} />
      {role === "owner" && session ? (
        <>
          <MembersSection orgId={orgId} currentUserId={session.user.id} />
          <InvitationsSection orgId={orgId} />
        </>
      ) : (
        <EmptyState title={shellMessages.members.ownersOnly} description="" />
      )}
    </>
  );
}
