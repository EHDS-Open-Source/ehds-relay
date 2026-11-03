import { createApiClient } from "@ehds-relay/api-client";

// The one API client for the app. Calls go through it; no hand-written fetch.
export const api = createApiClient();
