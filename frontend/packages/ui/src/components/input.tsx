import * as React from "react";
import { cn } from "@ehds-relay/ui/lib/utils";

import { useFieldDescribedBy } from "../form/Field";

export type FieldTone = "onWhite" | "onBlue";

/**
 * The underline field on blue: bold yellow text, white placeholder at 75%, a 2px white line
 * that turns yellow on focus, and a 3px pink line when invalid (still pink on focus). The
 * focus is shown by the line, so there is no outline. Autofill keeps these colours: see
 * `[data-tone="onBlue"]:-webkit-autofill` in styles.css.
 */
export const onBlueFieldClass =
  "h-auto rounded-none border-0 border-b-2 border-white bg-transparent px-0 pt-2 pb-3 text-[1.05em] leading-[normal] font-semibold text-yellow caret-yellow outline-none placeholder:font-medium placeholder:text-white/75 focus:border-yellow focus-visible:outline-none aria-invalid:border-b-[3px] aria-invalid:border-error aria-invalid:pb-2 focus:aria-invalid:border-error";

/** Boxed field on white; `tone="onBlue"` gives the underline field used on blue surfaces. */
function Input({
  className,
  type,
  tone = "onWhite",
  "aria-describedby": describedBy,
  ...props
}: React.ComponentProps<"input"> & { tone?: FieldTone }) {
  const ariaDescribedBy = useFieldDescribedBy(describedBy);
  return (
    <input
      type={type}
      data-slot="input"
      data-tone={tone}
      className={cn(
        "w-full min-w-0 transition-[color,border-color] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        tone === "onBlue"
          ? onBlueFieldClass
          : "h-[51px] rounded-field text-base border-2 border-input bg-white px-4 py-3 text-foreground selection:bg-blue selection:text-white file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-blue aria-invalid:border-destructive focus-visible:aria-invalid:border-destructive",
        className,
      )}
      {...props}
      aria-describedby={ariaDescribedBy}
    />
  );
}

export { Input };
