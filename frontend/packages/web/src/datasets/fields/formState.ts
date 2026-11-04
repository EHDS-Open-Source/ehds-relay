import { fieldErrorId } from "@ehds-relay/ui";
import { get, useFormState, type FieldPath } from "react-hook-form";

import type { DatasetFormValues } from "../formValues";

/** A path to a value in the dataset form, e.g. "distributions.0.access_url". */
export type FormPath = FieldPath<DatasetFormValues>;

/** Id of the input for a form value path, e.g. "input-distributions-0-access_url". */
export function inputId(path: string): string {
  return `input-${path.replaceAll(".", "-")}`;
}

/** The error message at a form value path, if any. */
export function useFieldError(path: string): string | undefined {
  const { errors } = useFormState<DatasetFormValues>({
    name: path as FormPath,
  });
  const error = get<unknown>(errors, path);
  if (typeof error !== "object" || error === null) return undefined;
  const { message } = error as { message?: unknown };
  return typeof message === "string" ? message : undefined;
}

/** Props that tie an input to its error text. */
export function errorProps(path: string, error: string | undefined) {
  return {
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? fieldErrorId(inputId(path)) : undefined,
  } as const;
}

/** Classes of the pale panel that holds a group of sub-fields. */
export const panelClass = "rounded-[16px] bg-blue-tint-95 p-4 sm:p-5";

/** The error of a group of inputs: its own message, else the one on its `root`. */
export function useGroupError(path: string): string | undefined {
  const own = useFieldError(path);
  const root = useFieldError(`${path}.root`);
  return own ?? root;
}

/** Whether anything at or beneath a form value path has an error, e.g. any sub-field of a group. */
export function useHasErrorUnder(path: string): boolean {
  const { errors } = useFormState<DatasetFormValues>({
    name: path as FormPath,
  });
  return hasError(get<unknown>(errors, path));
}

function hasError(node: unknown): boolean {
  if (typeof node !== "object" || node === null) return false;
  if (typeof (node as { message?: unknown }).message === "string") return true;
  // `ref` points at the input element, not at more errors
  return Object.entries(node).some(
    ([key, value]) => key !== "ref" && hasError(value),
  );
}

/**
 * What a group of inputs at `path` needs to show its errors: `invalid` turns its required
 * star magenta while any sub-field is wrong, `error` is the group's own message (shown under
 * its Add button) and `errorId` the id that message has.
 */
export function useGroupState(path: string): {
  invalid: boolean;
  error: string | undefined;
  errorId: string;
} {
  return {
    invalid: useHasErrorUnder(path),
    error: useGroupError(path),
    errorId: fieldErrorId(inputId(path)),
  };
}
