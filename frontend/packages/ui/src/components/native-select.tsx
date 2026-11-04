import * as React from "react";
import { cn } from "@ehds-relay/ui/lib/utils";

import type { FieldTone } from "./input";

/** A plain browser `<select>` with the same look as `Input`, and our chevron. Pass `<option>` children. */
function NativeSelect({
  className,
  tone = "onWhite",
  ...props
}: React.ComponentProps<"select"> & { tone?: FieldTone }) {
  return (
    <select
      data-slot="native-select"
      data-tone={tone}
      className={cn(
        "native-select h-11 w-full min-w-0 text-base transition-[color,border-color] duration-150 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        tone === "onBlue"
          ? "native-select-on-blue rounded-none border-0 border-b-2 border-white bg-transparent py-2 pr-8 pl-0 text-yellow aria-invalid:border-b-[3px] aria-invalid:border-error [&>option]:text-foreground"
          : "rounded-md border-2 border-input bg-white py-2 pr-12 pl-4 text-foreground focus-visible:border-blue aria-invalid:border-destructive focus-visible:aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { NativeSelect };
