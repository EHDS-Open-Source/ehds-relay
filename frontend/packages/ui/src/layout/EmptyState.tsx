import type { ReactNode } from "react";

import { Icon } from "../icons";
import { cn } from "../lib/utils";

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  /** Smaller, for under an existing list. Drops the action. */
  compact?: boolean;
  /** Announce the state when it appears, e.g. a search with no matches. */
  status?: boolean;
}

/** Stands in for a list that has nothing in it: says why, and what to do next. */
export function EmptyState({
  title,
  description,
  action,
  compact,
  status,
}: EmptyStateProps) {
  return (
    <div
      role={status || compact ? "status" : undefined}
      data-slot="empty-state"
      data-compact={compact ? "" : undefined}
      className={cn(
        "rounded-card border-2 border-dashed border-blue-tint-80 bg-white text-center",
        compact ? "px-6 py-8" : "px-6 py-14",
      )}
    >
      <Icon
        name="star"
        aria-hidden
        className={cn("mx-auto text-blue-tint-80", compact ? "mb-4" : "mb-5")}
        style={{
          width: compact ? 36 : 56,
          height: compact ? 36 : 56,
        }}
      />
      <h2
        className={cn(
          "font-bold text-blue",
          // The line height comes after the size: the class merger drops it otherwise.
          compact ? "text-base" : "text-[1.3em]",
          "leading-[1.3]",
        )}
      >
        {title}
      </h2>
      {description ? (
        <p className="mx-auto mt-2 max-w-[46ch] leading-[1.6] text-ink">
          {description}
        </p>
      ) : null}
      {action && !compact ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
