import createClient, { type ClientOptions } from "openapi-fetch";

import type { paths } from "./generated/schema";

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
 * Requests are same-origin (relative URLs; the dev server proxies them), and cookies are
 * sent with `credentials: "same-origin"`.
 */
export function createApiClient({
  baseUrl = "",
  // Look the global up per request so stubbing `fetch` after creating the client still works.
  fetch = (request) => globalThis.fetch(request),
}: ApiClientOptions = {}) {
  return createClient<paths>({
    baseUrl: resolveBaseUrl(baseUrl),
    credentials: "same-origin",
    fetch,
  });
}

export type ApiClient = ReturnType<typeof createApiClient>;
