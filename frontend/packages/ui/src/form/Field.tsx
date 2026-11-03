import type { ReactNode } from "react";

import { Label } from "../components/label";
import { cn } from "../lib/utils";

export interface FieldProps {
  label: string;
  /**
   * Id of the input the label is for. Leave it out for a group of inputs (a list, a pair of
   * inputs, radio buttons): the field is then a fieldset and the label its legend.
   */
  htmlFor?: string;
  /** Id for the wrapper, so other parts of a page can link to this field or focus it. */
  anchorId?: string;
  hint?: string;
  /** Message shown under the field; pass `fieldErrorId(htmlFor)` to the input's aria-describedby. */
  error?: string;
  /** Id of the error text. Defaults to `fieldErrorId(htmlFor ?? anchorId)`. */
  errorId?: string;
  className?: string;
  children: ReactNode;
}

/** Id of the error text for a field, for the input's `aria-describedby`. */
export function fieldErrorId(id: string): string {
  return `${id}-error`;
}

/** A labelled form field with an optional hint and error message. Works with any form library. */
export function Field({
  label,
  htmlFor,
  anchorId,
  hint,
  error,
  errorId,
  className,
  children,
}: FieldProps) {
  const errId =
    errorId ?? fieldErrorId(htmlFor ?? anchorId ?? label.replace(/\s+/g, "-"));
  const body = (
    <>
      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      {children}
      {error ? (
        <p id={errId} className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </>
  );
  const classes = cn("flex scroll-mt-24 flex-col gap-2", className);

  if (htmlFor) {
    return (
      <div
        id={anchorId}
        tabIndex={anchorId ? -1 : undefined}
        className={classes}
      >
        <Label htmlFor={htmlFor}>{label}</Label>
        {body}
      </div>
    );
  }
  return (
    <fieldset
      id={anchorId}
      tabIndex={anchorId ? -1 : undefined}
      aria-describedby={error ? errId : undefined}
      className={classes}
    >
      <legend className="mb-2 text-sm leading-none font-medium">{label}</legend>
      {body}
    </fieldset>
  );
}
