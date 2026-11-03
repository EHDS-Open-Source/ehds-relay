import { defineConfig } from "@hey-api/openapi-ts";

// Zod schemas for the request and response bodies, generated from the same spec as the types.
// Only the zod plugin runs: requests still go through openapi-fetch.
export default defineConfig({
  input: "openapi.json",
  output: { path: "src/generated/zod", postProcess: [] },
  plugins: [
    {
      name: "zod",
      definitions: true,
      requests: false,
      responses: false,
    },
  ],
});
