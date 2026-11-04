import {
  Button,
  ConfirmDialog,
  EmptyState,
  Icon,
  LoadingStar,
  NativeSelect,
  useMinimumPending,
  useToast,
} from "@ehds-relay/ui";
import { useState } from "react";

import { shellMessages } from "../shell/messages";
import { roleOptions } from "./format";
import { memberErrorMessage } from "./errors";
import {
  errorStatus,
  useChangeRole,
  useMembers,
  useRemoveMember,
  type Member,
  type MemberRole,
} from "./queries";
import {
  rowActions,
  rowCard,
  rowEmail,
  rowInfo,
  rowName,
  sectionHeading,
} from "./rowStyles";
import { RoleTag } from "./tags";

const m = shellMessages.members;

export function MembersSection({
  orgId,
  currentUserId,
  canChangeRoles = true,
}: {
  orgId: string;
  currentUserId: string;
  /** Owners change roles with a dropdown; anyone else sees the role as a tag. */
  canChangeRoles?: boolean;
}) {
  const members = useMembers(orgId);
  const changeRole = useChangeRole(orgId);
  const removeMember = useRemoveMember(orgId);
  const toast = useToast();
  const [removing, setRemoving] = useState<Member | null>(null);
  const loading = useMinimumPending(members.isPending);

  if (loading || members.isPending) {
    return <LoadingStar size="page" message={m.loadingUsers} />;
  }
  if (members.isError) {
    // About this list only, so said here rather than in a page banner.
    const forbidden = errorStatus(members.error) === 403;
    return (
      <div className="mb-12">
        <EmptyState
          status
          title={forbidden ? m.ownersOnly : m.loadFailed}
          action={
            forbidden ? undefined : (
              <Button
                type="button"
                variant="secondary"
                onClick={() => void members.refetch()}
              >
                {m.retry}
              </Button>
            )
          }
        />
      </div>
    );
  }

  const confirmRemove = () => {
    if (!removing) return;
    const { name } = removing;
    removeMember.mutate(removing.user_id, {
      onSuccess: () => {
        setRemoving(null);
        toast.show({ tone: "success", message: m.removed(name) });
      },
    });
  };

  return (
    <section aria-labelledby="members-heading" className="mb-12">
      <h2 id="members-heading" className={sectionHeading}>
        {m.list.title}
      </h2>
      <ul className="flex flex-col gap-3">
        {members.data.map((member) => (
          <li key={member.user_id} className={rowCard}>
            <div className={rowInfo}>
              <p className={rowName}>
                {member.name}
                {member.user_id === currentUserId ? (
                  <span className="ml-2 text-[0.8em] font-medium text-ink-3">
                    ({m.list.you})
                  </span>
                ) : null}
              </p>
              <p className={rowEmail}>{member.email}</p>
            </div>
            <div className={rowActions}>
              {canChangeRoles ? (
                // Compact, so the row keeps the height of a row with a role tag.
                <NativeSelect
                  aria-label={m.list.roleFor(member.name)}
                  className="h-[34px] w-36 shrink-0 py-0 pr-10 pl-4 text-[0.9em] font-semibold"
                  value={member.role}
                  disabled={changeRole.isPending}
                  onChange={(event) => {
                    const role = event.target.value as MemberRole;
                    changeRole.mutate(
                      { userId: member.user_id, role },
                      {
                        onSuccess: () => {
                          toast.show({
                            tone: "success",
                            message: m.roleChanged(member.name, role),
                          });
                        },
                        onError: (error) => {
                          toast.show({
                            tone: "error",
                            message: memberErrorMessage(error),
                          });
                        },
                      },
                    );
                  }}
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {m.roles[role]}
                    </option>
                  ))}
                </NativeSelect>
              ) : (
                <RoleTag role={member.role} />
              )}
              <Button
                type="button"
                variant="row"
                size="sm"
                aria-label={`${m.list.remove} ${member.name}`}
                onClick={() => {
                  removeMember.reset();
                  setRemoving(member);
                }}
              >
                {m.list.remove}
                <Icon name="remove" size="sm" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        title={removing ? m.removeDialog.title(removing.name) : ""}
        description={
          removing ? (
            <>
              <strong>{removing.name}</strong> {m.removeDialog.consequence}
            </>
          ) : (
            ""
          )
        }
        icon="remove"
        confirmLabel={m.removeDialog.confirm}
        destructive
        pending={removeMember.isPending}
        error={
          removeMember.isError
            ? memberErrorMessage(removeMember.error)
            : undefined
        }
        onConfirm={confirmRemove}
      />
    </section>
  );
}
