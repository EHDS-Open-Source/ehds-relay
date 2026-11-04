import type { ReactNode } from "react";

import { glyphs } from "../icons";
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
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      aria-hidden
      focusable="false"
      data-icon={overdue ? "calendar-alert" : "calendar-tick"}
      className="shrink-0"
    >
      {glyphs.calendar}
      {overdue ? (
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        >
          <path d="M12 12.5v3" />
          <path d="M12 18.2v.1" />
        </g>
      ) : (
        <path
          d="m8.8 15 2.2 2.2 4.2-4.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
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
