import type { ReactNode } from "react";

import { Icon, type IconName } from "../icons";
import { cn } from "../lib/utils";

export interface DetailPillProps {
  icon?: IconName;
  children: ReactNode;
  className?: string;
}

/** A short fact under a record's title, such as its access level or how many records it holds. */
export function DetailPill({ icon, children, className }: DetailPillProps) {
  return (
    <span
      data-slot="detail-pill"
      className={cn(
        "inline-flex min-h-[34px] max-w-full items-center gap-2 rounded-full bg-blue-tint-90 py-1.5 pr-4 pl-3 text-[0.85em] leading-[1.2] font-semibold text-blue",
        !icon && "pl-4",
        className,
      )}
    >
      {icon ? <Icon name={icon} size="xs" /> : null}
      {/* One line; only text too long for the screen wraps. */}
      <span className="min-w-0 [overflow-wrap:anywhere]">{children}</span>
    </span>
  );
}

/** A keyword on a record: the same 34px pill as the facts under the title, without an icon. */
export function KeywordPill({ children }: { children: ReactNode }) {
  return (
    <span
      data-slot="keyword"
      className="inline-flex min-h-[34px] max-w-full items-center rounded-full bg-blue-tint-90 px-4 py-1.5 text-[0.85em] leading-[1.2] font-semibold [overflow-wrap:anywhere] text-blue"
    >
      {children}
    </span>
  );
}
