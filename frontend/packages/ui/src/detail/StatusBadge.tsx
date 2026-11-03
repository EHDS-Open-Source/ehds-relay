import { Badge } from "../components/badge";
import { messages } from "../messages";

export interface StatusBadgeProps {
  status: "draft" | "published";
  /** Override the visible words. */
  labels?: { draft: string; published: string };
}

export function StatusBadge({
  status,
  labels = {
    draft: messages.statusDraft,
    published: messages.statusPublished,
  },
}: StatusBadgeProps) {
  return (
    <Badge
      variant={status === "published" ? "default" : "secondary"}
      data-status={status}
    >
      {labels[status]}
    </Badge>
  );
}
