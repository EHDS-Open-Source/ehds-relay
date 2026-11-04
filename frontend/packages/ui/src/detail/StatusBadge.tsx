import { Badge } from "../components/badge";
import { Icon } from "../icons";
import { messages } from "../messages";

export interface StatusBadgeProps {
  status: "draft" | "published";
  /** Override the visible words. */
  labels?: { draft: string; published: string };
}

/** Published is green with a tick and Draft is the plain tag with a pencil, so the two differ by more than colour. */
export function StatusBadge({
  status,
  labels = {
    draft: messages.statusDraft,
    published: messages.statusPublished,
  },
}: StatusBadgeProps) {
  const published = status === "published";
  return (
    <Badge variant={published ? "success" : "secondary"} data-status={status}>
      <Icon name={published ? "tick" : "edit"} size="xs" />
      {labels[status]}
    </Badge>
  );
}
