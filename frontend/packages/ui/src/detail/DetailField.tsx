import type { ReactNode } from "react";

import { cn } from "../lib/utils";

export interface DetailFieldProps {
  /** Id of the field's value, so it can be linked to. */
  id?: string;
  label: string;
  children: ReactNode;
  /** Span both columns, for long text. */
  wide?: boolean;
}

/** A label and its value inside a `DetailSection`. */
export function DetailField({ id, label, children, wide }: DetailFieldProps) {
  return (
    <div id={id} className={cn(wide && "sm:col-span-2")}>
      <dt className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 break-words whitespace-pre-line">{children}</dd>
    </div>
  );
}
