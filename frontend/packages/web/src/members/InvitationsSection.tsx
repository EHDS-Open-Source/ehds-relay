import {
  Badge,
  Button,
  ConfirmDialog,
  FilterChips,
  FormMessage,
  Input,
  Label,
  NativeSelect,
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
  const invite = useInvite(orgId);
  const resend = useResendInvitation(orgId);
  const cancel = useCancelInvitation(orgId);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("standard");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();
  const [cancelling, setCancelling] = useState<Invitation | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = email.trim();
    setNotice(undefined);
    invite.reset();
    if (trimmed === "") return setEmailError(text.emailRequired);
    if (!looksLikeEmail(trimmed)) return setEmailError(text.emailInvalid);
    setEmailError(undefined);
    invite.mutate(
      { email: trimmed, role },
      {
        onSuccess: (created) => {
          setEmail("");
          setNotice(text.sent(created.email));
        },
      },
    );
  };

  const doResend = (invitation: Invitation) => {
    setNotice(undefined);
    resend.mutate(invitation.id, {
      onSuccess: (updated) => {
        setNotice(text.resent(updated.email));
      },
    });
  };

  const confirmCancel = () => {
    if (!cancelling) return;
    cancel.mutate(cancelling.id, {
      onSuccess: () => {
        setCancelling(null);
      },
    });
  };

  return (
    <section aria-labelledby="invitations-heading">
      <h2 id="invitations-heading" className="mb-4 text-xl font-semibold">
        {text.title}
      </h2>
      <form
        noValidate
        onSubmit={submit}
        className="mb-4 flex flex-wrap items-start gap-4"
      >
        <div className="flex min-w-64 flex-1 flex-col gap-2">
          <Label htmlFor="invite-email">{text.emailLabel}</Label>
          <Input
            id="invite-email"
            type="email"
            value={email}
            autoComplete="off"
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? "invite-email-error" : undefined}
            onChange={(event) => {
              setEmail(event.target.value);
            }}
          />
          {emailError ? (
            <FormMessage id="invite-email-error">{emailError}</FormMessage>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="invite-role">{text.roleLabel}</Label>
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
        </div>
        <Button type="submit" className="mt-[26px]" disabled={invite.isPending}>
          {invite.isPending ? text.sending : text.send}
        </Button>
      </form>
      {invite.isError ? (
        <FormMessage className="mb-4">
          {invitationErrorMessage(invite.error)}
        </FormMessage>
      ) : null}
      {resend.isError ? (
        <FormMessage className="mb-4">
          {invitationErrorMessage(resend.error)}
        </FormMessage>
      ) : null}
      {notice ? (
        <p role="status" className="mb-4 text-sm">
          {notice}
        </p>
      ) : null}

      <div className="mb-4">
        <FilterChips
          label={text.filterLabel}
          options={filterOptions}
          value={filter}
          onChange={setFilter}
        />
      </div>

      {invitations.isPending ? (
        <p role="status">{shellMessages.loading}</p>
      ) : invitations.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {m.loadFailed}
        </p>
      ) : invitations.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">{text.empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-2 pr-4 font-medium">{text.email}</th>
                <th className="py-2 pr-4 font-medium">{text.role}</th>
                <th className="py-2 pr-4 font-medium">{text.sentOn}</th>
                <th className="py-2 pr-4 font-medium">{text.status}</th>
                <th className="py-2 font-medium">{text.actions}</th>
              </tr>
            </thead>
            <tbody>
              {invitations.data.map((invitation) => (
                <tr key={invitation.id} className="border-t">
                  <td className="py-3 pr-4">{invitation.email}</td>
                  <td className="py-3 pr-4">{m.roles[invitation.role]}</td>
                  <td className="py-3 pr-4">
                    {dateFormat.format(new Date(invitation.last_sent_at))}
                  </td>
                  <td className="py-3 pr-4">
                    <Badge
                      variant={
                        invitation.status === "pending"
                          ? "default"
                          : "secondary"
                      }
                      data-status={invitation.status}
                    >
                      {text.statuses[invitation.status]}
                    </Badge>
                  </td>
                  <td className="flex gap-2 py-3">
                    {invitation.status === "pending" ||
                    invitation.status === "expired" ? (
                      <Button
                        type="button"
                        variant="outline"
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
                        variant="outline"
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={cancelling !== null}
        onOpenChange={(open) => {
          if (!open) setCancelling(null);
        }}
        title={text.cancelDialog.title}
        description={
          cancelling ? text.cancelDialog.description(cancelling.email) : ""
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
