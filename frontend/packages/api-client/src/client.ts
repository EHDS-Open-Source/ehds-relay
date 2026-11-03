import createClient, { type ClientOptions } from "openapi-fetch";

import type { paths } from "./generated/schema";

/**
 * Header the API requires on state-changing requests under `/api/` (a CSRF guard: a
 * cross-site form or fetch cannot add a custom header without a CORS preflight). It is
 * enforced by middleware, so it is not in the OpenAPI spec and the client sets it itself.
 */
export const CSRF_HEADER = "X-Requested-By";
export const CSRF_HEADER_VALUE = "ehds-relay";

export interface ApiClientOptions {
  /** Prefix for every request path. Defaults to "": same origin as the page. */
  baseUrl?: string;
  /** Replacement for the global `fetch`, e.g. a stub in tests. */
  fetch?: ClientOptions["fetch"];
}

// `Request` only accepts absolute URLs outside a real browser (e.g. jsdom in tests), so anchor
// a relative base URL at the page origin. In a browser this resolves exactly as before.
function resolveBaseUrl(baseUrl: string): string {
  if (typeof location === "undefined") return baseUrl;
  return new URL(baseUrl, location.origin).href;
}

/**
 * Typed client for the relay API: paths, params and bodies are checked against the generated
 * OpenAPI types, so `api.GET("/healthz")` compiles and `api.GET("/nope")` does not.
 *
 * Requests are same-origin (relative URLs; the dev server proxies them), cookies are sent
 * with `credentials: "same-origin"`, and every request carries the CSRF header.
 */
export function createApiClient({
  baseUrl = "",
  // Look the global up per request so stubbing `fetch` after creating the client still works.
  fetch = (request) => globalThis.fetch(request),
}: ApiClientOptions = {}) {
  return createClient<paths>({
    baseUrl: resolveBaseUrl(baseUrl),
    credentials: "same-origin",
    headers: { [CSRF_HEADER]: CSRF_HEADER_VALUE },
    fetch,
  });
}

export type ApiClient = ReturnType<typeof createApiClient>;
