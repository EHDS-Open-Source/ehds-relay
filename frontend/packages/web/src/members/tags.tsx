import { Badge, Icon, cn } from "@ehds-relay/ui";
import type { ComponentProps } from "react";

import { shellMessages } from "../shell/messages";
import type { InvitationStatus, MemberRole } from "./queries";

// Tags in user rows: 0.8em Poppins 600, 4px by 12px, no border (27px tall at 15px).
const rowTag = "border-0 px-3 py-1 text-[0.8em] leading-[1.6]";

/** A role (Owner, Standard): the standard pale blue tag. Roles are not told apart by colour. */
export function RoleTag({
  role,
  className,
  ...props
}: { role: MemberRole } & Omit<ComponentProps<"span">, "children">) {
  return (
    <Badge className={cn(rowTag, className)} {...props}>
      {shellMessages.members.roles[role]}
    </Badge>
  );
}

const statusLook = {
  pending: "info",
  accepted: "success",
  expired: "warning",
  cancelled: "default",
} as const;

/**
 * Where an invitation stands, as a status pill: the role's tint with its deep shade.
 * Cancelled is neutral, with a cross so it does not rely on colour.
 */
export function StatusPill({ status }: { status: InvitationStatus }) {
  return (
    <Badge
      variant={statusLook[status]}
      data-status={status}
      className={cn(
        rowTag,
        status === "cancelled" && "bg-blue-tint-95 text-ink-3",
      )}
    >
      {status === "cancelled" ? <Icon name="close" size="xs" /> : null}
      {shellMessages.members.invitations.statuses[status]}
    </Badge>
  );
}
