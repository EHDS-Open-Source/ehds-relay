/** The tabs of the account page; the one that is not listed here is the default. */
export type AccountTab = "details" | "security";

export function isAccountTab(value: unknown): value is AccountTab {
  return value === "details" || value === "security";
}
