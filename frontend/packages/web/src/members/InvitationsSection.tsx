import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  FilterChips,
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

const m = shellMessages.members;
const text = m.invitations;
const cancelLabel = text.cancel;

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
      <h2 id="invitations-heading" className="mb-4 text-xl font-semibold">
        {text.title}
      </h2>
      <form
        noValidate
        onSubmit={submit}
        className="mb-6 flex flex-wrap items-start gap-4"
      >
        <Field
          className="min-w-64 flex-1"
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
        <Field label={text.roleLabel} htmlFor="invite-role">
          <NativeSelect
            id="invite-role"
            className="w-44"
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
        <Button type="submit" className="mt-[30px]" busy={invite.isPending}>
          {invite.isPending ? text.sending : text.send}
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
            <li
              key={invitation.id}
              className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-card bg-white px-5 py-4 shadow-card"
            >
              <div className="min-w-0">
                <p className="text-[1.15em] font-semibold break-all text-blue">
                  {invitation.email}
                </p>
                <p className="text-[0.85em] text-ink-3">
                  {text.sentOn(
                    dateFormat.format(new Date(invitation.last_sent_at)),
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge>{m.roles[invitation.role]}</Badge>
                <Badge
                  variant={invitation.status === "pending" ? "info" : "default"}
                  data-status={invitation.status}
                >
                  {text.statuses[invitation.status]}
                </Badge>
                {invitation.status === "pending" ||
                invitation.status === "expired" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    aria-label={`${text.resend} ${invitation.email}`}
                    disabled={resend.isPending}
                    onClick={() => {
                      doResend(invitation);
                    }}
                  >
                    {text.resend}
                  </Button>
                ) : null}
                {invitation.status === "pending" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    aria-label={`${text.cancel} ${invitation.email}`}
                    onClick={() => {
                      cancel.reset();
                      setCancelling(invitation);
                    }}
                  >
                    {cancelLabel}
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
