import type { ReactNode } from "react";

import { Icon } from "../icons";
import { cn } from "../lib/utils";

export interface RibbonProps {
  /** Normal is the pale blue strip; overdue is brand yellow and bold. */
  tone?: "due" | "overdue";
  /** Words before the date, e.g. "Revalidation due"; regular weight on the normal strip. */
  label?: ReactNode;
  /** The date or other value that follows the label. */
  children?: ReactNode;
  /** A second line, e.g. what to do about it. */
  detail?: ReactNode;
  /** A small button on the right. */
  action?: ReactNode;
}

/** A full-width strip under the header about when a record is next due for review. */
export function Ribbon({
  tone = "due",
  label,
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
        "w-full text-blue",
        overdue ? "bg-yellow font-bold" : "bg-blue-tint-95 font-semibold",
      )}
    >
      {/* Lined up with the header content: same 96% frame and side padding. */}
      <div className="mx-auto flex min-h-14 w-[96%] flex-wrap items-center gap-3 px-5 py-3 leading-[1.3] md:flex-nowrap md:px-10">
        <Icon
          name={overdue ? "calendarAlert" : "calendarTick"}
          size="lg"
          data-icon={overdue ? "calendar-alert" : "calendar-tick"}
        />
        <p className="min-w-0 flex-1">
          {label ? (
            <span
              data-slot="ribbon-label"
              className={cn("mr-[0.3em]", !overdue && "font-normal")}
            >
              {label}
            </span>
          ) : null}
          {children}
          {detail ? (
            <span
              data-slot="ribbon-help"
              className="mt-0.5 block text-[0.9em] font-medium text-ink"
            >
              {detail}
            </span>
          ) : null}
        </p>
        {action ? (
          // Phones: on its own line, lined up with the text after the icon.
          <div className="shrink-0 max-md:w-full max-md:pl-9">{action}</div>
        ) : null}
      </div>
    </div>
  );
}
