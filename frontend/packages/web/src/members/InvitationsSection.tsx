import {
  Button,
  ConfirmDialog,
  EmptyState,
  FilterChips,
  Icon,
  LoadingStar,
  useMinimumPending,
  useToast,
} from "@ehds-relay/ui";
import { useState } from "react";

import { shellMessages } from "../shell/messages";
import { invitationErrorMessage } from "./errors";
import { InviteDialog } from "./InviteDialog";
import { dateFormat } from "./format";
import {
  useCancelInvitation,
  useInvitations,
  useResendInvitation,
  type Invitation,
  type InvitationStatus,
} from "./queries";
import {
  rowActions,
  rowCard,
  rowInfo,
  rowName,
  sectionHeading,
} from "./rowStyles";
import { StatusPill } from "./tags";

const m = shellMessages.members;
const text = m.invitations;

type Filter = "all" | InvitationStatus;
const filterOptions = (
  ["all", "pending", "accepted", "cancelled", "expired"] as const
).map((value) => ({ value, label: text.filters[value] }));

export function InvitationsSection({
  orgId,
  orgName,
}: {
  orgId: string;
  orgName: string | undefined;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const invitations = useInvitations(
    orgId,
    filter === "all" ? undefined : filter,
  );
  const loadingList = useMinimumPending(invitations.isPending);
  const resend = useResendInvitation(orgId);
  const cancel = useCancelInvitation(orgId);
  const toast = useToast();
  const [inviting, setInviting] = useState(false);
  const [cancelling, setCancelling] = useState<Invitation | null>(null);

  const doResend = (invitation: Invitation) => {
    resend.mutate(invitation.id, {
      onSuccess: (updated) => {
        toast.show({ tone: "success", message: text.resent(updated.email) });
      },
      onError: (error) => {
        toast.show({ tone: "error", message: invitationErrorMessage(error) });
      },
    });
  };

  const confirmCancel = () => {
    if (!cancelling) return;
    const { email: address } = cancelling;
    cancel.mutate(cancelling.id, {
      onSuccess: () => {
        setCancelling(null);
        toast.show({ tone: "success", message: text.cancelled(address) });
      },
    });
  };

  return (
    <section aria-labelledby="invitations-heading">
      <h2 id="invitations-heading" className={sectionHeading}>
        {text.title}
      </h2>
      <div className="mb-6">
        <Button
          type="button"
          onClick={() => {
            setInviting(true);
          }}
        >
          {text.invite}
          <Icon name="addUser" />
        </Button>
      </div>
      <InviteDialog
        orgId={orgId}
        orgName={orgName}
        open={inviting}
        onOpenChange={setInviting}
      />

      <div className="mb-4">
        <FilterChips
          label={text.filterLabel}
          options={filterOptions}
          value={filter}
          onChange={setFilter}
        />
      </div>

      {loadingList || invitations.isPending ? (
        <LoadingStar size="page" message={m.loadingInvitations} />
      ) : invitations.isError ? (
        <EmptyState
          status
          title={m.loadFailed}
          action={
            <Button
              type="button"
              variant="secondary"
              onClick={() => void invitations.refetch()}
            >
              {m.retry}
            </Button>
          }
        />
      ) : invitations.data.length === 0 ? (
        <EmptyState compact title={text.empty} />
      ) : (
        <ul className="flex flex-col gap-3">
          {invitations.data.map((invitation) => (
            <li key={invitation.id} className={rowCard}>
              <div className={rowInfo}>
                <p className={`${rowName} break-all text-ink`}>
                  {invitation.name ?? invitation.email}
                </p>
                <p className="text-[0.9em] leading-[1.6] font-medium text-ink-3">
                  {text.subline(
                    invitation.email,
                    m.roles[invitation.role],
                    dateFormat.format(new Date(invitation.last_sent_at)),
                  )}
                </p>
              </div>
              <div className={rowActions}>
                <StatusPill status={invitation.status} />
                {invitation.status === "pending" ||
                invitation.status === "expired" ? (
                  <ResendButton
                    email={invitation.email}
                    busy={
                      resend.isPending && resend.variables === invitation.id
                    }
                    disabled={
                      resend.isPending && resend.variables !== invitation.id
                    }
                    onClick={() => {
                      doResend(invitation);
                    }}
                  />
                ) : null}
                {invitation.status === "pending" ? (
                  <Button
                    type="button"
                    variant="row"
                    size="sm"
                    aria-label={`${text.cancel} ${invitation.email}`}
                    onClick={() => {
                      cancel.reset();
                      setCancelling(invitation);
                    }}
                  >
                    {text.cancel}
                    <Icon name="remove" size="sm" />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={cancelling !== null}
        onOpenChange={(open) => {
          if (!open) setCancelling(null);
        }}
        title={cancelling ? text.cancelDialog.title(cancelling.email) : ""}
        description={
          cancelling ? (
            <>
              {text.cancelDialog.lead} <strong>{cancelling.email}</strong>{" "}
              {text.cancelDialog.trail}
            </>
          ) : (
            ""
          )
        }
        icon="remove"
        confirmLabel={text.cancelDialog.confirm}
        cancelLabel={text.cancelDialog.keep}
        destructive
        pending={cancel.isPending}
        error={
          cancel.isError ? invitationErrorMessage(cancel.error) : undefined
        }
        onConfirm={confirmCancel}
      />
    </section>
  );
}

function ResendButton({
  email,
  busy,
  disabled,
  onClick,
}: {
  email: string;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      aria-label={busy ? undefined : `${text.resend} ${email}`}
      busy={busy}
      disabled={disabled}
      onClick={onClick}
    >
      {busy ? text.resending : text.resend}
    </Button>
  );
}
