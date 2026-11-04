import type { ReactNode } from "react";

import { Icon } from "../icons";
import { cn } from "../lib/utils";

export interface RibbonProps {
  /** Normal is the pale blue strip; overdue is brand yellow. */
  tone?: "due" | "overdue";
  /** The first line. */
  children: ReactNode;
  /** A second line, e.g. what to do about it. */
  detail?: ReactNode;
  /** A button on the right. */
  action?: ReactNode;
}

function RibbonIcon({ overdue }: { overdue: boolean }) {
  return (
    <Icon
      name={overdue ? "calendarAlert" : "calendarTick"}
      size="lg"
      data-icon={overdue ? "calendar-alert" : "calendar-tick"}
    />
  );
}

/** A full-width strip under the header about when a record is next due for review. */
export function Ribbon({
  tone = "due",
  children,
  detail,
  action,
}: RibbonProps) {
  const overdue = tone === "overdue";
  return (
    <div
      role="status"
      data-slot="ribbon"
      data-tone={tone}
      className={cn(
        "min-h-14 w-full text-blue",
        overdue ? "bg-yellow" : "bg-blue-tint-95",
      )}
    >
      <div className="mx-auto flex w-[96%] flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3 md:px-10">
        <RibbonIcon overdue={overdue} />
        <div className="min-w-0 flex-1">
          <p className={cn(overdue && "font-bold")}>{children}</p>
          {detail ? (
            <p className="text-[0.9em] font-medium text-ink">{detail}</p>
          ) : null}
        </div>
        {action}
      </div>
    </div>
  );
}
