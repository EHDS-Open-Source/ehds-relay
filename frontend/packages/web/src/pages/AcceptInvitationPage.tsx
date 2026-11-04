import {
  Button,
  FormMessage,
  LoadingStar,
  useMinimumPending,
} from "@ehds-relay/ui";
import { Link, useNavigate, useParams } from "@tanstack/react-router";

import {
  DetailedApiError,
  errorStatus,
  useAcceptInvitation,
  useInvitationPreview,
  type InvitationStatus,
} from "../members/queries";
import { loginUrl } from "../session/login";
import { useSession, useSignOut } from "../session/useSession";
import { BareLayout } from "../shell/BareLayout";
import { shellMessages } from "../shell/messages";

const m = shellMessages.acceptInvite;

function Notice({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <BareLayout title={title} description={description}>
      {action}
    </BareLayout>
  );
}

/** Which "no longer valid" state a 410 answer means; the server names it in its reason. */
function goneStatus(error: unknown): "cancelled" | "expired" | "accepted" {
  const detail = error instanceof DetailedApiError ? error.detail : "";
  if (detail.includes("cancelled")) return "cancelled";
  if (detail.includes("expired")) return "expired";
  return "accepted";
}

/** The page the invitation email links to. Public: works signed out and signed in. */
export function AcceptInvitationPage() {
  const { token } = useParams({ from: "/invitations/$token" });
  const session = useSession();
  const navigate = useNavigate();
  const signOut = useSignOut();
  const preview = useInvitationPreview(token);
  const accept = useAcceptInvitation(token);
  const loading = useMinimumPending(preview.isPending);

  if (loading || preview.isPending) {
    return (
      <BareLayout>
        <LoadingStar size="page" message={m.loading} />
      </BareLayout>
    );
  }
  if (preview.isError) {
    return errorStatus(preview.error) === 404 ? (
      <Notice {...m.notFound} />
    ) : (
      <Notice title={shellMessages.serviceError.title} description={m.failed} />
    );
  }

  const invitation = preview.data;
  const redirect = `/invitations/${encodeURIComponent(token)}`;
  const gone = (status: Exclude<InvitationStatus, "pending">) => (
    <Notice
      {...m.gone[status]}
      action={
        session ? (
          <Button asChild onBlue>
            <Link to="/orgs">{m.goToOrganisations}</Link>
          </Button>
        ) : (
          <Button asChild onBlue>
            <a href={loginUrl({ redirect: "/" })}>{m.signIn}</a>
          </Button>
        )
      }
    />
  );

  if (invitation.status !== "pending") return gone(invitation.status);

  const acceptStatus = errorStatus(accept.error);
  if (acceptStatus === 404) return <Notice {...m.notFound} />;
  if (acceptStatus === 410) return gone(goneStatus(accept.error));
  if (acceptStatus === 403 && session) {
    return (
      <Notice
        title={m.wrongAccount.title}
        description={m.wrongAccount.description(
          invitation.email,
          session.user.email,
        )}
        action={
          <Button
            onBlue
            onClick={() => {
              void signOut();
            }}
          >
            {m.wrongAccount.signOut}
          </Button>
        }
      />
    );
  }

  const joinAs = [
    invitation.invited_by_name
      ? m.invitedBy(invitation.invited_by_name)
      : m.invitedByUnknown,
    m.asRole(shellMessages.members.roles[invitation.role]),
  ].join(" ");

  return (
    <BareLayout
      title={m.title(invitation.organisation_name)}
      description={joinAs}
    >
      <p className="-mt-4 mb-8 text-sm text-white">
        {m.forAddress(invitation.email)}
      </p>
      {session ? (
        <div className="flex flex-col items-start gap-4">
          {accept.isError ? (
            <FormMessage className="text-error">{m.failed}</FormMessage>
          ) : null}
          <Button
            size="lg"
            onBlue
            busy={accept.isPending}
            onClick={() => {
              accept.mutate(undefined, {
                onSuccess: (org) => {
                  void navigate({
                    to: "/orgs/$orgId/catalogue",
                    params: { orgId: org.id },
                  });
                },
              });
            }}
          >
            {accept.isPending ? m.accepting : m.accept}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-4">
          <p className="text-sm text-white">{m.signInHint}</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" onBlue>
              <a href={loginUrl({ redirect })}>{m.signIn}</a>
            </Button>
            <Button asChild size="lg" variant="secondary" onBlue>
              <a href={loginUrl({ redirect, signup: true })}>
                {m.createAccount}
              </a>
            </Button>
          </div>
        </div>
      )}
    </BareLayout>
  );
}
