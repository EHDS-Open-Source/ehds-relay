import { describe, expect, it, vi } from "vitest";

import { createApiClient } from "./client";

function stubFetch(body: unknown, status = 200) {
  return vi.fn<(request: Request) => Promise<Response>>(() =>
    Promise.resolve(Response.json(body, { status })),
  );
}

describe("createApiClient", () => {
  it("requests the health endpoint and returns typed data", async () => {
    const fetch = stubFetch({ status: "ok" });
    const api = createApiClient({ baseUrl: "http://relay.test", fetch });

    const { data } = await api.GET("/healthz");

    expect(fetch).toHaveBeenCalledOnce();
    const request = fetch.mock.calls[0]![0];
    expect(request.method).toBe("GET");
    expect(request.url).toBe("http://relay.test/healthz");
    expect(data?.status).toBe("ok");
  });

  it("sends cookies for same-origin requests only", async () => {
    const fetch = stubFetch({ status: "ok" });
    await createApiClient({ baseUrl: "http://relay.test", fetch }).GET(
      "/healthz",
    );
    expect(fetch.mock.calls[0]![0].credentials).toBe("same-origin");
  });

  it("rejects unknown paths at compile time", async () => {
    const api = createApiClient({
      baseUrl: "http://relay.test",
      fetch: stubFetch({ detail: "Not Found" }, 404),
    });

    // @ts-expect-error "/nope" is not a path in the OpenAPI spec
    const { response } = await api.GET("/nope");

    expect(response.status).toBe(404);
  });

  it("returns the error body instead of throwing on a non-2xx response", async () => {
    const api = createApiClient({
      baseUrl: "http://relay.test",
      fetch: stubFetch({ detail: "Not implemented yet" }, 501),
    });

    const { data, error } = await api.GET("/api/v1/me");

    expect(data).toBeUndefined();
    expect(error).toBeDefined();
  });
});
