// The dataset field and section map: keys, order, labels and anchor ids. The record view, the
// missing-fields checklist and the form all group and name fields from here, so they agree.
import type { Schemas } from "@ehds-relay/api-client";

import { shellMessages } from "../shell/messages";

export type DatasetMetadata = Schemas["DatasetMetadata"];
export type FieldKey = keyof DatasetMetadata;

/** How the record view renders a field's value. */
export type FieldKind =
  | "langTexts"
  | "text"
  | "boolean"
  | "number"
  | "accessRights"
  | "term"
  | "terms"
  | "strings"
  | "organisation"
  | "contactPoints"
  | "distributions"
  | "variables"
  | "temporal"
  | "turtle";

export interface FieldDef {
  key: FieldKey;
  label: string;
  kind: FieldKind;
}

export type SectionId =
  "main" | "access" | "coverage" | "organisations" | "technical" | "quantum";

export interface SectionDef {
  id: SectionId;
  label: string;
  fields: readonly FieldDef[];
}

const labels = shellMessages.datasets.fields;
const field = (key: FieldKey, kind: FieldKind): FieldDef => ({
  key,
  kind,
  label: labels[key],
});

/** Sections in the order the form shows them, each with its fields in form order. */
export const datasetSections: readonly SectionDef[] = [
  {
    id: "main",
    label: shellMessages.datasets.sections.main,
    fields: [
      field("title", "langTexts"),
      field("description", "langTexts"),
      field("distributions", "distributions"),
      field("structured_data", "boolean"),
      field("variables", "variables"),
      field("provenance", "text"),
      field("keyword", "strings"),
      field("health_theme", "terms"),
      field("health_category", "terms"),
      field("coding_system", "terms"),
      field("has_personal_data", "boolean"),
      field("conforms_to", "terms"),
    ],
  },
  {
    id: "access",
    label: shellMessages.datasets.sections.access,
    fields: [
      field("access_rights", "accessRights"),
      field("applicable_legislation", "terms"),
      field("health_data_access_body", "organisation"),
      field("geographical_coverage", "terms"),
      field("type", "terms"),
    ],
  },
  {
    id: "coverage",
    label: shellMessages.datasets.sections.coverage,
    fields: [
      field("number_of_records", "number"),
      field("number_of_unique_individuals", "number"),
      field("language", "terms"),
      field("code_values", "strings"),
      field("temporal_coverage", "temporal"),
    ],
  },
  {
    id: "organisations",
    label: shellMessages.datasets.sections.organisations,
    fields: [
      field("health_data_holder", "organisation"),
      field("publisher", "organisation"),
    ],
  },
  {
    id: "technical",
    label: shellMessages.datasets.sections.technical,
    fields: [
      field("contact_points", "contactPoints"),
      field("identifier", "strings"),
      field("generated_by", "terms"),
    ],
  },
  {
    id: "quantum",
    label: shellMessages.datasets.sections.quantum,
    fields: [field("quantum_label", "turtle")],
  },
];

const fieldsByKey = new Map<string, FieldDef>(
  datasetSections.flatMap((section) =>
    section.fields.map((f) => [f.key, f] as const),
  ),
);

/** Id of a field's input in the form, so a link can jump to it (`#field-<key>`). */
export function fieldAnchor(key: string): string {
  return `field-${key.split(".")[0]}`;
}

/**
 * Readable name for a key from `missing_for_publish`. Keys can point inside a field, such as
 * `publisher.contact_point`.
 */
export function missingFieldLabel(key: string): string {
  const [base = key, part] = key.split(".");
  const label = fieldsByKey.get(base)?.label ?? base;
  return part ? `${label} (${shellMessages.datasets.contactPointPart})` : label;
}
