/** Only follow post-sign-in redirects that stay on this site; anything else goes home. */
export function safeRedirect(target: string | undefined): string {
  return target?.startsWith("/") && !target.startsWith("//") ? target : "/";
}
