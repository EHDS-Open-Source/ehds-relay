import * as React from "react";
import { cn } from "@ehds-relay/ui/lib/utils";

import { useFieldDescribedBy } from "../form/Field";
import { onBlueFieldClass, type FieldTone } from "./input";

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
        "native-select w-full min-w-0 transition-[color,border-color] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        tone === "onBlue"
          ? // While the empty first option is chosen it reads as a placeholder (white at 75%).
            `native-select-on-blue ${onBlueFieldClass} cursor-pointer pr-8 has-[option[value='']:checked]:font-medium has-[option[value='']:checked]:text-white/75 [&_option]:bg-white [&_option]:font-normal [&_option]:text-black`
          : "h-[51px] rounded-field text-base border-2 border-input bg-white py-3 pr-12 pl-4 text-foreground focus-visible:border-blue aria-invalid:border-destructive focus-visible:aria-invalid:border-destructive",
        className,
      )}
      {...props}
      aria-describedby={ariaDescribedBy}
    />
  );
}

export { NativeSelect };
