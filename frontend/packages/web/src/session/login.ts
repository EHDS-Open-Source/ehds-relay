import { safeRedirect } from "../router/safeRedirect";

export const LOGIN_PATH = "/api/v1/auth/login";

/**
 * Address that starts sign-in (or registration with `signup`) and comes back to `redirect`.
 * Following it is a full-page navigation: the API answers with redirects to the identity provider.
 */
export function loginUrl({
  redirect,
  signup = false,
}: {
  redirect?: string;
  signup?: boolean;
} = {}): string {
  const query = new URLSearchParams({ redirect: safeRedirect(redirect) });
  if (signup) query.set("signup", "true");
  return `${LOGIN_PATH}?${query.toString()}`;
}
