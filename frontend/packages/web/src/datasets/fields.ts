import type { Schemas } from "@ehds-relay/api-client";

import { shellMessages } from "../shell/messages";

// The dataset's fields and the sections they are grouped in, in form order. The form, the
// dataset page and the missing-fields checklist all use this map, so they name and order
// fields the same way.

const text = shellMessages.datasetForm;

/** A top-level metadata field, e.g. "title" or "health_data_access_body". */
export type FieldKey = keyof Schemas["DatasetMetadata"];

export type SectionId = keyof typeof text.sections;

export interface DatasetSection {
  id: SectionId;
  title: string;
  fields: readonly FieldKey[];
}

export const datasetSections: readonly DatasetSection[] = [
  {
    id: "main",
    title: text.sections.main,
    fields: [
      "title",
      "description",
      "distributions",
      "structured_data",
      "variables",
      "provenance",
      "keyword",
      "health_theme",
      "health_category",
      "coding_system",
      "has_personal_data",
      "conforms_to",
    ],
  },
  {
    id: "access",
    title: text.sections.access,
    fields: [
      "access_rights",
      "applicable_legislation",
      "health_data_access_body",
      "geographical_coverage",
      "type",
    ],
  },
  {
    id: "coverage",
    title: text.sections.coverage,
    fields: [
      "number_of_records",
      "number_of_unique_individuals",
      "language",
      "code_values",
      "temporal_coverage",
    ],
  },
  {
    id: "organisations",
    title: text.sections.organisations,
    fields: ["health_data_holder", "publisher"],
  },
  {
    id: "technical",
    title: text.sections.technical,
    fields: ["contact_points", "identifier", "generated_by"],
  },
  {
    id: "quantum",
    title: text.sections.quantum,
    fields: ["quantum_label"],
  },
];

/** Every field in form order. */
export const fieldKeys: readonly FieldKey[] = datasetSections.flatMap(
  (section) => section.fields,
);

/** Section a field belongs to. */
export function sectionOf(key: FieldKey): SectionId {
  const section = datasetSections.find((s) => s.fields.includes(key));
  if (!section) throw new Error(`unknown dataset field ${key}`);
  return section.id;
}

/** Id of the section element on the form, e.g. "section-main". */
export function sectionAnchorId(id: SectionId): string {
  return `section-${id}`;
}

/**
 * Id of a field's element on the form: "field-<key>", e.g. "field-title". Keys of nested
 * parts from `missing_for_publish` (e.g. "publisher.contact_point") use dashes for the dots.
 */
export function fieldAnchorId(key: string): string {
  return `field-${key.replaceAll(".", "-")}`;
}

function isFieldKey(key: string): key is FieldKey {
  return key in text.fields;
}

/**
 * Label of a field key as `missing_for_publish` reports it: a top-level key such as
 * "keyword", or a nested part such as "publisher.contact_point".
 */
export function fieldLabel(key: string): string {
  if (isFieldKey(key)) return text.fields[key];
  const [head, ...rest] = key.split(".");
  if (head && isFieldKey(head)) {
    const part =
      rest.join(".") === "contact_point" ? text.contactPointOf : rest.join(" ");
    return `${text.fields[head]}: ${part}`;
  }
  return key;
}
