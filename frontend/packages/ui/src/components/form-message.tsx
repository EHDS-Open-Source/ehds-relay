import * as React from "react";
import { cn } from "@ehds-relay/ui/lib/utils";

/** A short message under a field or form. Errors are announced to screen readers. */
function FormMessage({
  className,
  tone = "error",
  ...props
}: React.ComponentProps<"p"> & { tone?: "error" | "info" }) {
  return (
    <p
      data-slot="form-message"
      role={tone === "error" ? "alert" : undefined}
      className={cn(
        "text-sm",
        tone === "error" ? "text-destructive" : "text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { FormMessage };
