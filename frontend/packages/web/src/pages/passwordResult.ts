/** How the identity provider's change-password page ended, as the API reports it on /account. */
export type PasswordResult = "success" | "cancelled" | "error";

export function isPasswordResult(value: unknown): value is PasswordResult {
  return value === "success" || value === "cancelled" || value === "error";
}
