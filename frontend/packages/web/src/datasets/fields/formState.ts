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
