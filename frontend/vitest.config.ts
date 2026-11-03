import { defineConfig } from "vitest/config";

// Each package is its own project with its own environment (jsdom, node, ...).
export default defineConfig({
  test: {
    projects: ["packages/*"],
  },
});
