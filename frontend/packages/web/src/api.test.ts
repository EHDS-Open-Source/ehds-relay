import { createApiClient } from "@ehds-relay/api-client";
import { describe, expect, it, vi } from "vitest";

import { unauthorizedMiddleware } from "./api";

function clientAnswering(status: number) {
  const onUnauthorized = vi.fn();
  const api = createApiClient({
    fetch: () => Promise.resolve(Response.json({ status: "ok" }, { status })),
  });
  api.use(unauthorizedMiddleware(onUnauthorized));
  return { api, onUnauthorized };
}

describe("unauthorizedMiddleware", () => {
  it("reports a 401 from any call", async () => {
    const { api, onUnauthorized } = clientAnswering(401);
    await api.GET("/healthz");
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it("ignores other answers", async () => {
    for (const status of [200, 403, 500]) {
      const { api, onUnauthorized } = clientAnswering(status);
      await api.GET("/healthz");
      expect(onUnauthorized).not.toHaveBeenCalled();
    }
  });
});
