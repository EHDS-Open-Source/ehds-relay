/**
 * Only follow post-sign-in redirects that stay on this site; anything else goes home.
 * Same rules as the API: no `//` or `/\` (both can mean another site) and no control characters.
 */
export function safeRedirect(target: string | undefined | null): string {
  if (!target?.startsWith("/")) return "/";
  if (target.startsWith("//") || target.startsWith("/\\")) return "/";
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(target)) return "/";
  return target;
}
