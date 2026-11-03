import { createApiClient } from "@ehds-relay/api-client";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HealthStatus } from "./HealthStatus";
import { messages } from "./messages";

function stubFetch(body: unknown, status = 200) {
  return vi.fn<(request: Request) => Promise<Response>>(() =>
    Promise.resolve(Response.json(body, { status })),
  );
}

describe("HealthStatus", () => {
  it("requests /healthz and renders its status", async () => {
    const fetch = stubFetch({ status: "ok" });

    render(<HealthStatus client={createApiClient({ fetch })} />);

    expect(
      await screen.findByText(messages.healthStatus("ok")),
    ).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledOnce();
    expect(new URL(fetch.mock.calls[0]![0].url).pathname).toBe("/healthz");
  });

  it("says so when the API does not answer", async () => {
    const fetch = stubFetch({ detail: "down" }, 503);

    render(<HealthStatus client={createApiClient({ fetch })} />);

    expect(
      await screen.findByText(messages.healthUnavailable),
    ).toBeInTheDocument();
  });
});
