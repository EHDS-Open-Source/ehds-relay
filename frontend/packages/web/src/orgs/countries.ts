import { shellMessages } from "../shell/messages";

/** Saved for organisations outside the EU list. */
export const OTHER_COUNTRY = "XX";

/**
 * The 27 EU member states, as the two-letter codes the API stores. Greece is `EL`, as the EU
 * itself writes it, not the ISO code `GR`.
 */
export const euCountryCodes = [
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "EL",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
] as const;

/** English name for a stored country code; unknown codes are shown as they are. */
export function countryName(code: string | null | undefined): string {
  if (!code) return "";
  const names: Readonly<Record<string, string>> = shellMessages.countries;
  return names[code] ?? code;
}
