import type { ReactNode } from "react";

import { cn } from "../lib/utils";
import { messages } from "../messages";

export interface DetailFieldProps {
  /** Id of the field's row, so it can be linked to. */
  id?: string;
  label: ReactNode;
  children?: ReactNode;
  /** Running text, such as a description: set in regular weight with more line height. */
  long?: boolean;
  /** Keep the label for screen readers only, when the section title already says it. */
  labelHidden?: boolean;
  /** Read out in place of the dash when there is no value. */
  emptyLabel?: string;
}

function isEmpty(children: ReactNode): boolean {
  return (
    children === null ||
    children === undefined ||
    children === false ||
    (typeof children === "string" && children.trim() === "")
  );
}

/** One row of a `DetailSection`: the label stacked above its value, or a dash when empty. */
export function DetailField({
  id,
  label,
  children,
  long = false,
  labelHidden = false,
  emptyLabel = messages.detail.empty,
}: DetailFieldProps) {
  const empty = isEmpty(children);
  return (
    <div
      id={id}
      data-slot="detail-field"
      className="min-w-0 bg-white px-6 py-4"
    >
      <dt
        className={cn(
          labelHidden
            ? "sr-only"
            : "mb-2 text-[0.78em] leading-[1.6] font-normal tracking-[0.06em] text-blue uppercase",
        )}
      >
        {label}
      </dt>
      <dd
        data-long={long || undefined}
        className={cn(
          "text-[1.02em] [overflow-wrap:anywhere] whitespace-pre-line",
          empty
            ? "leading-[1.5] font-normal text-ink-3"
            : long
              ? "leading-[1.7] font-normal text-ink"
              : "leading-[1.5] font-semibold text-ink",
        )}
      >
        {empty ? (
          <>
            <span aria-hidden>—</span>
            <span className="sr-only">{emptyLabel}</span>
          </>
        ) : (
          children
        )}
      </dd>
    </div>
  );
}
