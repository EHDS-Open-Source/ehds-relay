// Typed client for the relay API, generated from the backend OpenAPI spec into src/generated/.
import type { components } from "./generated/schema";

export { CSRF_HEADER, CSRF_HEADER_VALUE, createApiClient } from "./client";
export type { ApiClient, ApiClientOptions } from "./client";
export type { components, operations, paths } from "./generated/schema";

/** Request and response bodies, e.g. `Schemas["HealthDTO"]`. */
export type Schemas = components["schemas"];
