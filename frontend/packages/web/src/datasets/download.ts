import type { Schemas } from "@ehds-relay/api-client";

export type ExportFormat = Schemas["ExportFormat"];

export interface ExportFormatInfo {
  format: ExportFormat;
  /** File extension without the dot. */
  extension: string;
  mediaType: string;
}

export const exportFormats: readonly ExportFormatInfo[] = [
  { format: "ttl", extension: "ttl", mediaType: "text/turtle" },
  { format: "jsonld", extension: "jsonld", mediaType: "application/ld+json" },
  { format: "rdfxml", extension: "rdf", mediaType: "application/rdf+xml" },
];

export function exportFormatInfo(format: ExportFormat): ExportFormatInfo {
  const info = exportFormats.find((f) => f.format === format);
  if (!info) throw new Error(`Unknown export format: ${format}`);
  return info;
}

export function isExportFormat(value: unknown): value is ExportFormat {
  return exportFormats.some((f) => f.format === value);
}

/** Lower-case words joined by hyphens; accents are dropped. Empty when nothing is left. */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** `<slug>.<ext>` for a dataset title, or `<fallback>.<ext>` when the title has no letters. */
export function exportFileName(
  title: string | null | undefined,
  format: ExportFormat,
  fallback: string,
): string {
  const slug = slugify(title ?? "") || fallback;
  return `${slug}.${exportFormatInfo(format).extension}`;
}

/** Saves text as a file through the browser. */
export function downloadText(
  text: string,
  fileName: string,
  mediaType: string,
): void {
  const url = URL.createObjectURL(new Blob([text], { type: mediaType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
