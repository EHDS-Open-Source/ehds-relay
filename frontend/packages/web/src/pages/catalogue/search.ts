import { isAccessFilter, type AccessFilter } from "./filterDatasets";

export interface CatalogueSearch {
  q?: string;
  access?: Exclude<AccessFilter, "all">;
  /** Only datasets overdue for revalidation. */
  overdue?: true;
}

/** URL search params of the catalogue. Unknown or default values are dropped. */
export function validateCatalogueSearch(
  search: Record<string, unknown>,
): CatalogueSearch {
  const out: CatalogueSearch = {};
  if (typeof search.q === "string" && search.q.trim() !== "") out.q = search.q;
  if (isAccessFilter(search.access) && search.access !== "all")
    out.access = search.access;
  if (search.overdue === true || search.overdue === "true") out.overdue = true;
  return out;
}
