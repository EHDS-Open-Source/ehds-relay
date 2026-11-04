import { createContext, useContext, type ReactNode } from "react";

import { FormMessage } from "../components/form-message";
import type { FieldTone } from "../components/input";
import { Label } from "../components/label";
import { Icon } from "../icons";
import { cn } from "../lib/utils";
import { messages } from "../messages";

export interface FieldProps {
  label: string;
  /**
   * Id of the input the label is for. Leave it out for a group of inputs (a list, a pair of
   * inputs, radio buttons): the field is then a fieldset and the label its legend.
   */
  htmlFor?: string;
  /** Id for the wrapper, so other parts of a page can link to this field or focus it. */
  anchorId?: string;
  /** One short sentence of help, shown 8px under the field. */
  hint?: string;
  /** Marks the field as required: a star beside the label plus text for screen readers. */
  required?: boolean;
  /** Message shown directly under the field. */
  error?: string;
  /** Id of the error text. Defaults to `fieldErrorId(htmlFor ?? anchorId)`. */
  errorId?: string;
  /**
   * Something inside the field is wrong although the field has no message of its own, e.g. a
   * sub-field of a group: the required star turns to the error colour.
   */
  invalid?: boolean;
  /**
   * Ids of messages shown elsewhere in a group (e.g. under its Add button) that describe the
   * whole group; added to the fieldset's `aria-describedby`.
   */
  describedBy?: string;
  /** `onBlue` for fields on a blue surface: white label, yellow star, pink error. */
  tone?: FieldTone;
  className?: string;
  children: ReactNode;
}

/** Id of the error text for a field, for the input's `aria-describedby`. */
export function fieldErrorId(id: string): string {
  return `${id}-error`;
}

/** Id of the hint text for a field. */
export function fieldHintId(id: string): string {
  return `${id}-hint`;
}

/** Joins ids for `aria-describedby`, leaving out empty and repeated ones. */
export function joinIds(
  ...ids: readonly (string | undefined | false)[]
): string | undefined {
  const unique = [
    ...new Set(ids.flatMap((id) => (id ? id.split(/\s+/) : []))),
  ].filter(Boolean);
  return unique.length ? unique.join(" ") : undefined;
}

// The ids that describe the input of the nearest labelled field (its error, then its hint).
const DescribedByContext = createContext<string | undefined>(undefined);

/**
 * The `aria-describedby` for an input inside a `Field`: the ids passed in, plus the field's
 * own error and hint. Inputs call it so the hint is read out without every caller wiring it.
 */
export function useFieldDescribedBy(own?: string): string | undefined {
  return joinIds(own, useContext(DescribedByContext));
}

function RequiredMark({
  invalid,
  onBlue,
}: {
  invalid: boolean;
  onBlue: boolean;
}) {
  return (
    <>
      <span
        data-slot="required-star"
        data-invalid={invalid || undefined}
        aria-hidden="true"
        className={cn(
          "ml-[0.25em] inline-flex size-[0.72em] shrink-0 self-center",
          invalid
            ? onBlue
              ? "text-error"
              : "text-destructive"
            : onBlue
              ? "text-yellow"
              : "text-required",
        )}
      >
        <Icon name="star" style={{ width: "100%", height: "100%" }} />
      </span>
      <span className="sr-only">{messages.required}</span>
    </>
  );
}

/** Help text under a field: the info icon and one short sentence in the hint blue. */
export function FieldHint({
  id,
  onBlue = false,
  className,
  children,
}: {
  id?: string;
  onBlue?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <p
      id={id}
      data-slot="field-hint"
      className={cn(
        "flex items-start gap-2 text-[0.88em] leading-normal font-medium",
        onBlue ? "text-white" : "text-blue-hint",
        className,
      )}
    >
      <Icon
        name="info"
        className="mt-0.5 size-4"
        style={{ width: 16, height: 16 }}
      />
      <span>{children}</span>
    </p>
  );
}

/** A labelled form field with an optional hint and error message. Works with any form library. */
export function Field({
  label,
  htmlFor,
  anchorId,
  hint,
  required,
  error,
  errorId,
  invalid,
  describedBy,
  tone = "onWhite",
  className,
  children,
}: FieldProps) {
  const onBlue = tone === "onBlue";
  const baseId = htmlFor ?? anchorId ?? label.replace(/\s+/g, "-");
  const errId = errorId ?? fieldErrorId(baseId);
  const hintId = fieldHintId(baseId);
  const labelContent = (
    <>
      {label}
      {required ? (
        <RequiredMark invalid={!!error || !!invalid} onBlue={onBlue} />
      ) : null}
    </>
  );
  // The control first, then its error directly under it, then the hint 8px below.
  const body = (
    <>
      {children}
      {error ? (
        <FormMessage
          id={errId}
          className={cn("mt-1", onBlue ? "text-error" : undefined)}
        >
          {error}
        </FormMessage>
      ) : null}
      {hint ? (
        <FieldHint id={hintId} onBlue={onBlue}>
          {hint}
        </FieldHint>
      ) : null}
    </>
  );
  const classes = cn("flex scroll-mt-24 flex-col gap-2", className);
  const labelClass = cn("gap-0", onBlue ? "text-white" : undefined);
  const ownIds = joinIds(error && errId, hint && hintId);

  if (htmlFor) {
    return (
      <div
        id={anchorId}
        tabIndex={anchorId ? -1 : undefined}
        data-tone={tone}
        data-invalid={error || invalid ? true : undefined}
        className={classes}
      >
        <Label htmlFor={htmlFor} className={labelClass}>
          {labelContent}
        </Label>
        <DescribedByContext.Provider value={ownIds}>
          {body}
        </DescribedByContext.Provider>
      </div>
    );
  }
  return (
    <fieldset
      id={anchorId}
      tabIndex={anchorId ? -1 : undefined}
      data-tone={tone}
      data-invalid={error || invalid ? true : undefined}
      aria-describedby={joinIds(describedBy, ownIds)}
      className={classes}
    >
      <legend
        className={cn(
          "mb-2 flex items-center text-[0.95em] leading-snug font-semibold",
          onBlue ? "text-white" : "text-foreground",
        )}
      >
        {labelContent}
      </legend>
      {/* Inputs inside a group describe themselves; the group's ids sit on the fieldset */}
      <DescribedByContext.Provider value={undefined}>
        {body}
      </DescribedByContext.Provider>
    </fieldset>
  );
}
