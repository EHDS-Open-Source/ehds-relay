import { Button, ConfirmDialog, NativeSelect } from "@ehds-relay/ui";
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
  const [removing, setRemoving] = useState<Member | null>(null);

  if (members.isPending) {
    return <p role="status">{shellMessages.loading}</p>;
  }
  if (members.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {errorStatus(members.error) === 403 ? m.ownersOnly : m.loadFailed}
      </p>
    );
  }

  const confirmRemove = () => {
    if (!removing) return;
    removeMember.mutate(removing.user_id, {
      onSuccess: () => {
        setRemoving(null);
      },
    });
  };

  return (
    <section aria-labelledby="members-heading" className="mb-12">
      <h2 id="members-heading" className="mb-4 text-xl font-semibold">
        {m.list.title}
      </h2>
      {changeRole.isError ? (
        <p role="alert" className="mb-3 text-sm text-destructive">
          {memberErrorMessage(changeRole.error)}
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-2 pr-4 font-medium">{m.list.name}</th>
              <th className="py-2 pr-4 font-medium">{m.list.email}</th>
              <th className="py-2 pr-4 font-medium">{m.list.role}</th>
              <th className="py-2 pr-4 font-medium">{m.list.joined}</th>
              <th className="py-2 font-medium">{m.list.actions}</th>
            </tr>
          </thead>
          <tbody>
            {members.data.map((member) => (
              <tr key={member.user_id} className="border-t">
                <td className="py-3 pr-4">
                  {member.name}
                  {member.user_id === currentUserId ? (
                    <span className="ml-2 text-muted-foreground">
                      ({m.list.you})
                    </span>
                  ) : null}
                </td>
                <td className="py-3 pr-4">{member.email}</td>
                <td className="py-3 pr-4">
                  <NativeSelect
                    aria-label={m.list.roleFor(member.name)}
                    className="w-32"
                    value={member.role}
                    disabled={changeRole.isPending}
                    onChange={(event) => {
                      changeRole.mutate({
                        userId: member.user_id,
                        role: event.target.value as MemberRole,
                      });
                    }}
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {m.roles[role]}
                      </option>
                    ))}
                  </NativeSelect>
                </td>
                <td className="py-3 pr-4">
                  {dateFormat.format(new Date(member.joined_at))}
                </td>
                <td className="py-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={`${m.list.remove} ${member.name}`}
                    onClick={() => {
                      removeMember.reset();
                      setRemoving(member);
                    }}
                  >
                    {m.list.remove}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        title={m.removeDialog.title}
        description={removing ? m.removeDialog.description(removing.name) : ""}
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
