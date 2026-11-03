import { createApiClient } from "@ehds-relay/api-client";
import createQueryClient from "openapi-react-query";

// The one API client for the app. Calls go through it; no hand-written fetch.
export const api = createApiClient();

// The same client as typed TanStack Query hooks: `$api.useQuery("get", "/path", { params })`.
export const $api = createQueryClient(api);
