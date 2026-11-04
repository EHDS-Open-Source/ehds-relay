import {
  Button,
  ConfirmDialog,
  EmptyState,
  LoadingStar,
  NativeSelect,
  useMinimumPending,
  useToast,
} from "@ehds-relay/ui";
import { useState } from "react";

import { shellMessages } from "../shell/messages";
import { dateFormat, roleOptions } from "./format";
import { memberErrorMessage } from "./errors";
import {
  errorStatus,
  useChangeRole,
  useMembers,
  useRemoveMember,
  type Member,
  type MemberRole,
} from "./queries";

const m = shellMessages.members;

export function MembersSection({
  orgId,
  currentUserId,
}: {
  orgId: string;
  currentUserId: string;
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
      <h2 id="members-heading" className="mb-4 text-xl font-semibold">
        {m.list.title}
      </h2>
      <ul className="flex flex-col gap-3">
        {members.data.map((member) => (
          <li
            key={member.user_id}
            className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-card bg-white px-5 py-4 shadow-card"
          >
            <div className="min-w-0">
              <p className="text-[1.15em] font-semibold break-words text-blue">
                {member.name}
                {member.user_id === currentUserId ? (
                  <span className="ml-2 text-[0.8em] font-medium text-ink-3">
                    ({m.list.you})
                  </span>
                ) : null}
              </p>
              <p className="text-[0.9em] font-semibold break-all text-ink-3">
                {member.email}
              </p>
              <p className="text-[0.85em] text-ink-3">
                {m.list.joinedOn(dateFormat.format(new Date(member.joined_at)))}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Wide enough for "Standard" beside the chevron. */}
              <NativeSelect
                aria-label={m.list.roleFor(member.name)}
                className="w-44 shrink-0"
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
