/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Ports come from env so several checkouts can run side by side.
const webPort = Number(process.env.WEB_PORT ?? 5173);
const apiTarget = `http://localhost:${process.env.API_LOCAL_PORT ?? 8000}`;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: webPort,
    strictPort: true,
    // Same origin for the SPA and the API: no CORS, and session cookies just work.
    // The health endpoints live at the root, not under /api, so they need their own entries.
    proxy: {
      "/api": apiTarget,
      "/healthz": apiTarget,
      "/readyz": apiTarget,
    },
  },
  test: {
    name: "web",
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
