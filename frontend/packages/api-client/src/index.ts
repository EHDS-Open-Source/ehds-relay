// Typed client for the relay API, generated from the backend OpenAPI spec into src/generated/.
import type { components } from "./generated/schema";

export { CSRF_HEADER, CSRF_HEADER_VALUE, createApiClient } from "./client";
export type { ApiClient, ApiClientOptions } from "./client";
export type { components, operations, paths } from "./generated/schema";

/** Request and response bodies, e.g. `Schemas["HealthDTO"]`. */
export type Schemas = components["schemas"];

/**
 * Zod schemas for the same bodies, e.g. `zDatasetMetadata`, so forms validate with the
 * backend's own rules (URLs, emails, number ranges, language tags).
 */
export * from "./generated/zod/zod.gen";
