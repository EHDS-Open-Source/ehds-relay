import type { ReactNode } from "react";

import { Icon, type IconName } from "../icons";
import { cn } from "../lib/utils";

export interface DetailPillProps {
  icon?: IconName;
  children: ReactNode;
  className?: string;
}

/** A short fact under a record's title, such as its access level or when it last changed. */
export function DetailPill({ icon, children, className }: DetailPillProps) {
  return (
    <span
      data-slot="detail-pill"
      className={cn(
        "inline-flex h-[34px] items-center gap-2 rounded-full bg-blue-tint-90 px-4 text-[0.85em] font-semibold text-blue",
        className,
      )}
    >
      {icon ? <Icon name={icon} size="sm" /> : null}
      {children}
    </span>
  );
}
