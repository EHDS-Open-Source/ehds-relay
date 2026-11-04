import type { Schemas } from "@ehds-relay/api-client";

export type Dataset = Schemas["DatasetDTO"];
export type AccessRights = Schemas["AccessRights"];
export type AccessFilter = "all" | AccessRights;

export const accessFilters: readonly AccessFilter[] = [
  "all",
  "public",
  "restricted",
  "non_public",
];

/** The revalidation chip: every dataset, or only those overdue for revalidation. */
export type RevalidationFilter = "any" | "overdue";
export const revalidationFilters: readonly RevalidationFilter[] = [
  "any",
  "overdue",
];

export function isAccessFilter(value: unknown): value is AccessFilter {
  return accessFilters.includes(value as AccessFilter);
}

export interface CatalogueFields {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  categories: string[];
  access: AccessRights | null;
  draft: boolean;
  /** Published and not validated for a year. */
  overdue: boolean;
  /** The revalidation reminder (`YYYY-MM-DD`), if one is set. */
  reminderDate: string | null;
  /** Position in the whole catalogue, so a dataset keeps its star colour while filtering. */
  index: number;
  /** Every title and description text, for matching. */
  searchable: string;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function texts(value: unknown): string[] {
  return asArray(value).flatMap((entry) => {
    const text = (entry as { text?: unknown } | null)?.text;
    return typeof text === "string" && text ? [text] : [];
  });
}

function strings(value: unknown): string[] {
  return asArray(value).filter((v): v is string => typeof v === "string");
}

/**
 * The fields the catalogue shows and searches. The metadata is an untyped record on the
 * wire and older rows may have another shape, so every read is defensive.
 */
export function readCatalogueFields(
  dataset: Dataset,
  index = 0,
): CatalogueFields {
  const metadata: Record<string, unknown> =
    dataset.metadata && typeof dataset.metadata === "object"
      ? dataset.metadata
      : {};
  const titles = texts(metadata.title);
  const descriptions = texts(metadata.description);
  const title = titles[0] ?? dataset.title ?? "";
  const description = descriptions[0] ?? dataset.description ?? "";
  const keywords = strings(metadata.keyword);
  const categories = asArray(metadata.health_category).flatMap((entry) => {
    const label = (entry as { label?: unknown } | null)?.label;
    return typeof label === "string" && label ? [label] : [];
  });
  const access = isAccessFilter(metadata.access_rights)
    ? metadata.access_rights === "all"
      ? null
      : metadata.access_rights
    : null;
  const searchable = [
    ...titles,
    ...descriptions,
    dataset.title ?? "",
    dataset.description ?? "",
    ...keywords,
    ...categories,
  ]
    .join("\n")
    .toLowerCase();
  return {
    id: dataset.id,
    title,
    description,
    keywords,
    categories,
    access,
    draft: dataset.status === "draft",
    overdue: dataset.overdue === true,
    reminderDate: dataset.reminder_date ?? null,
    index,
    searchable,
  };
}

/**
 * Case-insensitive search plus the access and revalidation chips. Datasets without an access
 * level only match "all".
 */
export function filterDatasets(
  datasets: readonly CatalogueFields[],
  query: string,
  access: AccessFilter,
  revalidation: RevalidationFilter = "any",
): CatalogueFields[] {
  const needle = query.trim().toLowerCase();
  return datasets.filter(
    (d) =>
      (access === "all" || d.access === access) &&
      (revalidation === "any" || d.overdue) &&
      (needle === "" || d.searchable.includes(needle)),
  );
}
