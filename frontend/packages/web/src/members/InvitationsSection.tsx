import {
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  FilterChips,
  Icon,
  Input,
  LoadingStar,
  NativeSelect,
  fieldErrorId,
  useMinimumPending,
  useToast,
} from "@ehds-relay/ui";
import { useState, type FormEvent } from "react";

import { shellMessages } from "../shell/messages";
import { invitationErrorMessage } from "./errors";
import { dateFormat, roleOptions } from "./format";
import {
  useCancelInvitation,
  useInvitations,
  useInvite,
  useResendInvitation,
  type Invitation,
  type InvitationStatus,
  type MemberRole,
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

// A loose check; the server has the final say.
const looksLikeEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value);

export function InvitationsSection({ orgId }: { orgId: string }) {
  const [filter, setFilter] = useState<Filter>("all");
  const invitations = useInvitations(
    orgId,
    filter === "all" ? undefined : filter,
  );
  const loadingList = useMinimumPending(invitations.isPending);
  const invite = useInvite(orgId);
  const resend = useResendInvitation(orgId);
  const cancel = useCancelInvitation(orgId);
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("standard");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [cancelling, setCancelling] = useState<Invitation | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = email.trim();
    invite.reset();
    const problem =
      trimmed === ""
        ? text.emailRequired
        : !looksLikeEmail(trimmed)
          ? text.emailInvalid
          : undefined;
    if (problem) {
      setEmailError(problem);
      document.getElementById("invite-email")?.focus();
      return;
    }
    setEmailError(undefined);
    invite.mutate(
      { email: trimmed, role },
      {
        onSuccess: (created) => {
          setEmail("");
          toast.show({ tone: "success", message: text.sent(created.email) });
        },
      },
    );
  };

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

  const serverError = invite.isError
    ? invitationErrorMessage(invite.error)
    : undefined;
  const shownError = emailError ?? serverError;

  return (
    <section aria-labelledby="invitations-heading">
      <h2 id="invitations-heading" className={sectionHeading}>
        {text.title}
      </h2>
      {/* On wider screens the fields share rows (label, control, message, hint), so the
          button lines up with the controls whatever is shown under them. */}
      <form
        noValidate
        onSubmit={submit}
        className="mb-6 flex flex-col gap-4 md:grid md:grid-cols-[minmax(0,1fr)_11rem_auto] md:grid-rows-[repeat(4,auto)] md:gap-x-4 md:gap-y-0"
      >
        <Field
          className="md:row-span-4 md:grid md:grid-rows-subgrid"
          label={text.emailLabel}
          htmlFor="invite-email"
          required
          hint={text.emailHint}
          error={shownError}
        >
          <Input
            id="invite-email"
            type="email"
            value={email}
            autoComplete="off"
            aria-invalid={shownError ? true : undefined}
            aria-describedby={
              shownError ? fieldErrorId("invite-email") : undefined
            }
            onChange={(event) => {
              setEmail(event.target.value);
            }}
          />
        </Field>
        <Field
          className="md:row-span-4 md:grid md:grid-rows-subgrid"
          label={text.roleLabel}
          htmlFor="invite-role"
        >
          <NativeSelect
            id="invite-role"
            value={role}
            onChange={(event) => {
              setRole(event.target.value as MemberRole);
            }}
          >
            {roleOptions.map((option) => (
              <option key={option} value={option}>
                {m.roles[option]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Button
          type="submit"
          className="self-start md:col-start-3 md:row-start-2 md:self-center"
          busy={invite.isPending}
        >
          {invite.isPending ? text.sending : text.send}
          <Icon name="addUser" />
        </Button>
      </form>

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
                  {invitation.email}
                </p>
                <p className="text-[0.9em] leading-[1.6] font-medium text-ink-3">
                  {text.subline(
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
