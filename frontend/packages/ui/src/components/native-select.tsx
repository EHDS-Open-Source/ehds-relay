import * as React from "react";
import { cn } from "@ehds-relay/ui/lib/utils";

import { useFieldDescribedBy } from "../form/Field";
import type { FieldTone } from "./input";

/** A plain browser `<select>` with the same look as `Input`, and our chevron. Pass `<option>` children. */
function NativeSelect({
  className,
  tone = "onWhite",
  "aria-describedby": describedBy,
  ...props
}: React.ComponentProps<"select"> & { tone?: FieldTone }) {
  const ariaDescribedBy = useFieldDescribedBy(describedBy);
  return (
    <select
      data-slot="native-select"
      data-tone={tone}
      className={cn(
        "native-select w-full min-w-0 text-base transition-[color,border-color] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        tone === "onBlue"
          ? "native-select-on-blue h-11 rounded-none border-0 border-b-2 border-white bg-transparent py-2 pr-8 pl-0 text-yellow aria-invalid:border-b-[3px] aria-invalid:border-error [&>option]:text-foreground"
          : "h-[51px] rounded-field border-2 border-input bg-white py-3 pr-12 pl-4 text-foreground focus-visible:border-blue aria-invalid:border-destructive focus-visible:aria-invalid:border-destructive",
        className,
      )}
      {...props}
      aria-describedby={ariaDescribedBy}
    />
  );
}

export { NativeSelect };
