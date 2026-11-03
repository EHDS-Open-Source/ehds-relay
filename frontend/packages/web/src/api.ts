import { createApiClient, type ApiClient } from "@ehds-relay/api-client";

type Middleware = Parameters<ApiClient["use"]>[0];

/**
 * Calls `onUnauthorized` when the API says the session is gone (a 401 from any call), e.g.
 * after an idle timeout. It is only about calls made while signed in; the handler decides.
 */
export function unauthorizedMiddleware(onUnauthorized: () => void): Middleware {
  return {
    onResponse({ response }) {
      if (response.status === 401) onUnauthorized();
      return undefined;
    },
  };
}

let handleUnauthorized: () => void = () => {};

/** Set once by the app: what to do when any API call comes back unauthorized. */
export function setUnauthorizedHandler(handler: () => void) {
  handleUnauthorized = handler;
}

// The one API client for the app. Calls go through it; no hand-written fetch.
export const api = createApiClient();
api.use(
  unauthorizedMiddleware(() => {
    handleUnauthorized();
  }),
);
