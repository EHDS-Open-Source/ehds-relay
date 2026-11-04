import * as React from "react";
import { cn } from "@ehds-relay/ui/lib/utils";

/** A plain browser `<select>` with the same look as `Input`, and our chevron. Pass `<option>` children. */
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        "native-select h-11 w-full min-w-0 rounded-md border-2 border-input bg-white py-2 pr-12 pl-4 text-base text-foreground transition-[color,border-color] duration-150 focus-visible:border-blue disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive focus-visible:aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { NativeSelect };
