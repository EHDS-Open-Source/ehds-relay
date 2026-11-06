import type { Schemas } from "@ehds-relay/api-client";

// The form's own values. They differ from the API's metadata: every input holds a string,
// yes/no questions can be unanswered, lists keep their empty rows, and each organisation
// is always an object. `toMetadata` turns them into the API shape and `fromMetadata` back.

export type DatasetMetadata = Schemas["DatasetMetadata"];
export type AccessRights = Schemas["AccessRights"];

export type YesNo = "" | "yes" | "no";

export interface TermValue {
  label: string;
  uri: string;
}

export interface LangTextValue {
  lang: string;
  text: string;
}

export interface ContactPointValue {
  name: string;
  email: string;
}

export interface OrganisationValue {
  name: string;
  type: TermValue;
  contact_point: ContactPointValue;
}

export interface PublisherValue extends OrganisationValue {
  description: string;
}

export interface DistributionValue {
  title: string;
  description: string;
  access_url: string;
  format: TermValue;
  applicable_legislation: TermValue[];
}

export interface VariableValue {
  name: string;
  data_type: string;
  definition: string;
  coding_system: string;
}

export interface DatasetFormValues {
  title: LangTextValue[];
  description: LangTextValue[];
  distributions: DistributionValue[];
  structured_data: YesNo;
  variables: VariableValue[];
  provenance: string;
  keyword: string[];
  health_theme: TermValue[];
  health_category: TermValue[];
  coding_system: TermValue[];
  has_personal_data: YesNo;
  conforms_to: TermValue[];
  access_rights: "" | AccessRights;
  applicable_legislation: TermValue[];
  health_data_access_body: OrganisationValue;
  geographical_coverage: TermValue[];
  type: TermValue[];
  number_of_records: string;
  number_of_unique_individuals: string;
  language: TermValue[];
  code_values: string[];
  temporal_coverage: { start: string; end: string };
  health_data_holder: OrganisationValue;
  publisher: PublisherValue;
  contact_points: ContactPointValue[];
  identifier: string[];
  generated_by: TermValue[];
  quantum_label: string;
}

/** Term-list fields: each is a list of name and web address pairs. */
export const termListKeys = [
  "health_theme",
  "health_category",
  "coding_system",
  "conforms_to",
  "applicable_legislation",
  "geographical_coverage",
  "type",
  "language",
  "generated_by",
] as const satisfies readonly (keyof DatasetFormValues)[];

export type TermListKey = (typeof termListKeys)[number];

export const DEFAULT_LANG = "en";

export const emptyTerm = (): TermValue => ({ label: "", uri: "" });
export const emptyLangText = (): LangTextValue => ({
  lang: DEFAULT_LANG,
  text: "",
});
export const emptyContactPoint = (): ContactPointValue => ({
  name: "",
  email: "",
});
export const emptyDistribution = (): DistributionValue => ({
  title: "",
  description: "",
  access_url: "",
  format: emptyTerm(),
  applicable_legislation: [emptyTerm()],
});
export const emptyVariable = (): VariableValue => ({
  name: "",
  data_type: "",
  definition: "",
  coding_system: "",
});

/** At least one row, so each list shows an input to start with. */
function rows<T>(items: T[], empty: () => T): T[] {
  return items.length ? items : [empty()];
}

const str = (value: string | null | undefined): string => value ?? "";

function yesNo(value: boolean | null | undefined): YesNo {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "";
}

type Term = Schemas["Term"];
type Organisation = Schemas["Organisation"];

function termValue(term: Term | null | undefined): TermValue {
  return { label: str(term?.label), uri: str(term?.uri) };
}

function termRows(terms: Term[] | null | undefined): TermValue[] {
  return rows((terms ?? []).map(termValue), emptyTerm);
}

function organisationValue(
  org: Organisation | null | undefined,
): OrganisationValue {
  return {
    name: str(org?.name),
    type: termValue(org?.type),
    contact_point: {
      name: str(org?.contact_point?.name),
      email: str(org?.contact_point?.email),
    },
  };
}

/** Form values for a dataset's saved metadata, or an empty form when there is none. */
export function fromMetadata(
  metadata: DatasetMetadata | Record<string, unknown> = {},
): DatasetFormValues {
  // Stored metadata was validated by the server on the way in, so it has this shape
  const m = metadata as DatasetMetadata;
  const langRows = (
    texts: (Schemas["TitleText"] | Schemas["DescriptionText"])[] | undefined,
  ) =>
    rows(
      (texts ?? []).map((t) => ({ lang: str(t.lang), text: str(t.text) })),
      emptyLangText,
    );
  const numberText = (n: number | null | undefined) =>
    n === null || n === undefined ? "" : String(n);

  return {
    title: langRows(m.title),
    description: langRows(m.description),
    distributions: rows(
      (m.distributions ?? []).map((d) => ({
        title: str(d.title),
        description: str(d.description),
        access_url: str(d.access_url),
        format: termValue(d.format),
        applicable_legislation: termRows(d.applicable_legislation),
      })),
      emptyDistribution,
    ),
    structured_data: yesNo(m.structured_data),
    variables: rows(
      (m.variables ?? []).map((v) => ({
        name: str(v.name),
        data_type: str(v.data_type),
        definition: str(v.definition),
        coding_system: str(v.coding_system),
      })),
      emptyVariable,
    ),
    provenance: str(m.provenance),
    keyword: [...(m.keyword ?? [])],
    health_theme: termRows(m.health_theme),
    health_category: termRows(m.health_category),
    coding_system: termRows(m.coding_system),
    has_personal_data: yesNo(m.has_personal_data),
    conforms_to: termRows(m.conforms_to),
    access_rights: m.access_rights ?? "",
    applicable_legislation: termRows(m.applicable_legislation),
    health_data_access_body: organisationValue(m.health_data_access_body),
    geographical_coverage: termRows(m.geographical_coverage),
    type: termRows(m.type),
    number_of_records: numberText(m.number_of_records),
    number_of_unique_individuals: numberText(m.number_of_unique_individuals),
    language: termRows(m.language),
    code_values: [...(m.code_values ?? [])],
    temporal_coverage: {
      start: str(m.temporal_coverage?.start),
      end: str(m.temporal_coverage?.end),
    },
    health_data_holder: organisationValue(m.health_data_holder),
    publisher: {
      ...organisationValue(m.publisher),
      description: str(m.publisher?.description),
    },
    contact_points: rows(
      (m.contact_points ?? []).map((c) => ({
        name: str(c.name),
        email: str(c.email),
      })),
      emptyContactPoint,
    ),
    identifier: [...(m.identifier ?? [])],
    generated_by: termRows(m.generated_by),
    quantum_label: str(m.quantum_label),
  };
}

/**
 * Where each list item of the metadata came from in the form values: dropping empty rows
 * shifts indices, so error paths from validation are mapped back through this.
 * Keyed by the metadata path of the list ("distributions", "distributions.0.applicable_legislation").
 */
export type IndexMap = Map<string, number[]>;

export interface MappedMetadata {
  metadata: DatasetMetadata;
  indexMap: IndexMap;
}

const trim = (value: string) => value.trim();
const blank = (value: string) => value.trim() === "";

function isEmptyTerm(term: TermValue): boolean {
  return blank(term.label) && blank(term.uri);
}

function termOut(term: TermValue): Term {
  return { label: trim(term.label), uri: trim(term.uri) };
}

/** Keeps the non-empty rows and records where each came from. */
function compact<T, U>(
  items: readonly T[],
  isEmpty: (item: T) => boolean,
  map: (item: T, outIndex: number) => U,
  indexMap: IndexMap,
  path: string,
): U[] {
  const out: U[] = [];
  const from: number[] = [];
  items.forEach((item, index) => {
    if (isEmpty(item)) return;
    from.push(index);
    out.push(map(item, out.length));
  });
  indexMap.set(path, from);
  return out;
}

function setIfAny<K extends keyof DatasetMetadata>(
  target: DatasetMetadata,
  key: K,
  value: DatasetMetadata[K] | undefined,
): void {
  if (value === undefined || value === "") return;
  if (Array.isArray(value) && value.length === 0) return;
  target[key] = value;
}

function yesNoOut(value: YesNo): boolean | undefined {
  if (value === "yes") return true;
  if (value === "no") return false;
  return undefined;
}

function numberOut(value: string): number | undefined {
  if (blank(value)) return undefined;
  // Not a whole number? Send it anyway (as NaN or a fraction) so validation reports it
  return Number(value.trim());
}

function contactOut(
  contact: ContactPointValue,
): Schemas["ContactPoint"] | undefined {
  if (blank(contact.name) && blank(contact.email)) return undefined;
  return { name: trim(contact.name), email: trim(contact.email) };
}

function organisationOut(org: OrganisationValue): Organisation | undefined {
  const out: Organisation = { name: trim(org.name) };
  if (!isEmptyTerm(org.type)) out.type = termOut(org.type);
  const contact = contactOut(org.contact_point);
  if (contact) out.contact_point = contact;
  if (!out.name && !out.type && !out.contact_point) return undefined;
  return out;
}

/**
 * API metadata for the form values, plus the index map for error paths. Text is trimmed,
 * empty rows and unanswered questions are left out, an empty organisation is left out (the
 * server stores it as null), numbers are parsed, and variables are sent only for
 * structured data.
 */
export function mapToMetadata(values: DatasetFormValues): MappedMetadata {
  const indexMap: IndexMap = new Map();
  const m: DatasetMetadata = {};

  const langTexts = (key: "title" | "description") =>
    compact(
      values[key],
      (t) => blank(t.text),
      (t) => ({ lang: trim(t.lang), text: trim(t.text) }),
      indexMap,
      key,
    );
  const terms = (list: TermValue[], path: string) =>
    compact(list, isEmptyTerm, termOut, indexMap, path);
  const tags = (list: string[]) => list.map(trim).filter(Boolean);

  setIfAny(m, "title", langTexts("title"));
  setIfAny(m, "description", langTexts("description"));
  setIfAny(
    m,
    "distributions",
    compact(
      values.distributions,
      (d) =>
        blank(d.title) &&
        blank(d.description) &&
        blank(d.access_url) &&
        isEmptyTerm(d.format) &&
        d.applicable_legislation.every(isEmptyTerm),
      (d, i) => {
        const out: Schemas["Distribution"] = {
          access_url: trim(d.access_url),
          applicable_legislation: terms(
            d.applicable_legislation,
            `distributions.${i}.applicable_legislation`,
          ),
        };
        if (!blank(d.title)) out.title = trim(d.title);
        if (!blank(d.description)) out.description = trim(d.description);
        if (!isEmptyTerm(d.format)) out.format = termOut(d.format);
        return out;
      },
      indexMap,
      "distributions",
    ),
  );
  setIfAny(m, "structured_data", yesNoOut(values.structured_data));
  if (values.structured_data === "yes") {
    setIfAny(
      m,
      "variables",
      compact(
        values.variables,
        (v) =>
          blank(v.name) &&
          blank(v.data_type) &&
          blank(v.definition) &&
          blank(v.coding_system),
        (v) => {
          const out: Schemas["Variable"] = {
            name: trim(v.name),
            data_type: trim(v.data_type),
            definition: trim(v.definition),
          };
          if (!blank(v.coding_system))
            out.coding_system = trim(v.coding_system);
          return out;
        },
        indexMap,
        "variables",
      ),
    );
  }
  setIfAny(m, "provenance", trim(values.provenance));
  setIfAny(m, "keyword", tags(values.keyword));
  for (const key of termListKeys) setIfAny(m, key, terms(values[key], key));
  setIfAny(m, "has_personal_data", yesNoOut(values.has_personal_data));
  setIfAny(m, "access_rights", values.access_rights || undefined);
  setIfAny(
    m,
    "health_data_access_body",
    organisationOut(values.health_data_access_body),
  );
  setIfAny(m, "number_of_records", numberOut(values.number_of_records));
  setIfAny(
    m,
    "number_of_unique_individuals",
    numberOut(values.number_of_unique_individuals),
  );
  setIfAny(m, "code_values", tags(values.code_values));
  const { start, end } = values.temporal_coverage;
  if (!blank(start) || !blank(end)) {
    m.temporal_coverage = {};
    if (!blank(start)) m.temporal_coverage.start = trim(start);
    if (!blank(end)) m.temporal_coverage.end = trim(end);
  }
  setIfAny(m, "health_data_holder", organisationOut(values.health_data_holder));
  const publisher = organisationOut(values.publisher);
  if (publisher || !blank(values.publisher.description)) {
    m.publisher = { ...(publisher ?? { name: "" }) };
    if (!blank(values.publisher.description)) {
      m.publisher.description = trim(values.publisher.description);
    }
  }
  setIfAny(
    m,
    "contact_points",
    compact(
      values.contact_points,
      (c) => contactOut(c) === undefined,
      (c) => contactOut(c)!,
      indexMap,
      "contact_points",
    ),
  );
  setIfAny(m, "identifier", tags(values.identifier));
  if (!blank(values.quantum_label)) m.quantum_label = values.quantum_label;

  return { metadata: m, indexMap };
}

/** API metadata for the form values; see `mapToMetadata`. */
export function toMetadata(values: DatasetFormValues): DatasetMetadata {
  return mapToMetadata(values).metadata;
}

/**
 * Form value path ("distributions.2.access_url") for a path into the mapped metadata
 * (["distributions", 0, "access_url"]), undoing the shift from dropped empty rows.
 */
export function formPath(
  path: readonly PropertyKey[],
  indexMap: IndexMap,
): string {
  const out: string[] = [];
  const metaPath: string[] = [];
  for (const segment of path) {
    if (typeof segment === "number") {
      const from = indexMap.get(metaPath.join("."));
      out.push(String(from?.[segment] ?? segment));
      metaPath.push(String(segment));
    } else {
      out.push(String(segment));
      metaPath.push(String(segment));
    }
  }
  return out.join(".");
}
