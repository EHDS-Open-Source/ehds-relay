import type { ComponentProps } from "react";

import { Button } from "../components/button";
import { Icon } from "../icons";
import { cn } from "../lib/utils";

// Success colours for a moment after saving; hover keeps them so the state stays readable.
const savedClass =
  "border-success-on-white bg-success-bg text-success-on-white hover:border-success-on-white hover:bg-success-bg hover:text-success-on-white";

export interface SaveButtonProps extends Omit<
  ComponentProps<typeof Button>,
  "children" | "busy"
> {
  /** The resting label, e.g. "Save changes". */
  label: string;
  /** Shown while saving, e.g. "Saving…". */
  busyLabel: string;
  /** Shown for a moment after a save, e.g. "Saved". */
  savedLabel: string;
  busy?: boolean;
  saved?: boolean;
}

/**
 * The Save changes button: the save icon after the label, "Saving…" while busy, then
 * "Saved" with a tick in the success colours for a moment.
 */
export function SaveButton({
  label,
  busyLabel,
  savedLabel,
  busy = false,
  saved = false,
  className,
  type = "submit",
  ...props
}: SaveButtonProps) {
  const iconSize = props.size === "sm" ? "sm" : "md";
  return (
    <Button
      type={type}
      busy={busy}
      data-saved={saved && !busy ? true : undefined}
      className={cn(saved && !busy ? savedClass : undefined, className)}
      {...props}
    >
      {busy ? (
        busyLabel
      ) : saved ? (
        <>
          {savedLabel}
          <Icon name="tick" size={iconSize} />
        </>
      ) : (
        <>
          {label}
          <Icon name="save" size={iconSize} />
        </>
      )}
    </Button>
  );
}
