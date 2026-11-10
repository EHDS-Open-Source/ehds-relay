import { safeRedirect } from "../router/safeRedirect";

export const LOGIN_PATH = "/api/v1/auth/login";

/** Account actions the identity provider runs after asking the user to sign in again. */
export type LoginAction = "change_password";

/**
 * Address that starts sign-in (or registration with `signup`) and comes back to `redirect`.
 * With `action`, the provider asks for the current password again and then runs the action.
 * Following it is a full-page navigation: the API answers with redirects to the identity provider.
 */
export function loginUrl({
  redirect,
  signup = false,
  action,
}: {
  redirect?: string;
  signup?: boolean;
  action?: LoginAction;
} = {}): string {
  const query = new URLSearchParams({ redirect: safeRedirect(redirect) });
  if (signup) query.set("signup", "true");
  else if (action) query.set("action", action);
  return `${LOGIN_PATH}?${query.toString()}`;
}
