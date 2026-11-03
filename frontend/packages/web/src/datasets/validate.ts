import { zDatasetMetadata } from "@ehds-relay/api-client";
import type { FieldErrors } from "react-hook-form";

import { shellMessages } from "../shell/messages";
import {
  formPath,
  mapToMetadata,
  type DatasetFormValues,
  type DatasetMetadata,
  type IndexMap,
} from "./formValues";

// Checks run before a save. The rules come from the backend through the generated Zod
// schema, so the form never disagrees with the server about what a valid answer is. Whether
// a dataset is complete enough to publish is left to the server.

const text = shellMessages.datasetForm;

export interface FormIssue {
  /** Form value path, e.g. "distributions.0.access_url". */
  path: string;
  message: string;
}

export type ValidationResult =
  { ok: true; metadata: DatasetMetadata } | { ok: false; issues: FormIssue[] };

/** Title of a dataset for lists: the English one, else the first (like the server). */
function hasTitle(metadata: DatasetMetadata): boolean {
  const titles = metadata.title ?? [];
  const chosen = titles.find((t) => t.lang === "en") ?? titles[0];
  return Boolean(chosen?.text.trim());
}

const urlKeys = new Set(["uri", "access_url", "coding_system"]);
const numberKeys = new Set([
  "number_of_records",
  "number_of_unique_individuals",
]);

/** A message for a rule broken at `path`; the last part of the path says what kind of answer it is. */
export function messageFor(path: string, kind?: string): string {
  const last = path.split(".").at(-1) ?? "";
  if (kind === "too_small" && last === "applicable_legislation") {
    return text.errors.atLeastOne;
  }
  if (numberKeys.has(last)) return text.errors.wholeNumber;
  if (kind === "too_small" || kind === "missing") return text.errors.required;
  if (urlKeys.has(last)) return text.errors.url;
  if (last === "email") return text.errors.email;
  if (last === "lang") return text.errors.lang;
  return text.invalid;
}

/** Form issues for the metadata the form values map to, or the metadata if it may be saved. */
export function validateForSave(values: DatasetFormValues): ValidationResult {
  const { metadata, indexMap } = mapToMetadata(values);
  const issues: FormIssue[] = [];
  if (!hasTitle(metadata)) {
    issues.push({ path: "title.0.text", message: text.status.titleRequired });
  }
  const parsed = zDatasetMetadata.safeParse(metadata);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const path = formPath(issue.path, indexMap);
      issues.push({ path, message: messageFor(path, issue.code) });
    }
  }
  return issues.length ? { ok: false, issues } : { ok: true, metadata };
}

/** One entry of a FastAPI 422 response. */
export interface ServerIssue {
  loc: (string | number)[];
  msg: string;
  type?: string;
}

/**
 * Form issues for a 422 from the server. Its `loc` is ["body", "metadata", ...path]; an
 * issue about the whole request (no field) gets an empty path.
 */
export function serverIssues(
  issues: readonly ServerIssue[],
  indexMap: IndexMap,
): FormIssue[] {
  return issues.map((issue) => {
    const loc =
      issue.loc[0] === "body" && issue.loc[1] === "metadata"
        ? issue.loc.slice(2)
        : [];
    const path = formPath(loc, indexMap);
    const kind = issue.type === "missing" ? "missing" : undefined;
    return { path, message: path ? messageFor(path, kind) : text.invalid };
  });
}

/** React Hook Form errors object for a list of issues (first issue per path wins). */
export function toFieldErrors(
  issues: readonly FormIssue[],
): FieldErrors<DatasetFormValues> {
  const errors: Record<string, unknown> = {};
  for (const { path, message } of issues) {
    if (!path) continue;
    const parts = path.split(".");
    let node = errors;
    for (const part of parts.slice(0, -1)) {
      const child = node[part];
      if (
        typeof child === "object" &&
        child !== null &&
        !("message" in child)
      ) {
        node = child as Record<string, unknown>;
      } else if (child === undefined) {
        const created: Record<string, unknown> = {};
        node[part] = created;
        node = created;
      } else {
        // An error is already set on a parent path; keep it
        node = {};
      }
    }
    const leaf = parts.at(-1)!;
    if (node[leaf] === undefined) {
      node[leaf] = { type: "validate", message };
    }
  }
  return errors;
}
