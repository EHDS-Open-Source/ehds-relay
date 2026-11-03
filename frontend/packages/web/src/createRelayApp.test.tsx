import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "./api";
import { createRelayApp } from "./createRelayApp";
import { demoSession, makeOrg } from "./session/testing";

function stubApi(orgs: unknown[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn((request: Request) => {
      const path = new URL(request.url).pathname;
      if (path === "/api/v1/me")
        return Promise.resolve(Response.json(demoSession.user));
      if (path === "/api/v1/organisations")
        return Promise.resolve(Response.json(orgs));
      return Promise.resolve(Response.json({ status: "ok" }));
    }),
  );
}

describe("createRelayApp", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("loads the session from the API and lands in the only organisation", async () => {
    stubApi([makeOrg()]);
    const RelayApp = createRelayApp({ plugins: [] });
    render(<RelayApp />);
    expect(
      await screen.findByRole("heading", { name: "Dataset Catalogue" }),
    ).toBeVisible();
    expect(
      within(screen.getByRole("banner")).getByText("Demo org"),
    ).toBeVisible();
  });

  it("shows the sign-in page when the API says 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response(null, { status: 401 }))),
    );
    const RelayApp = createRelayApp();
    render(<RelayApp />);
    expect(
      await screen.findByRole("heading", { name: "Sign in" }),
    ).toBeVisible();
  });

  it("goes to sign-in with the current page when a later call returns 401", async () => {
    stubApi([makeOrg()]);
    const RelayApp = createRelayApp();
    render(<RelayApp />);
    await screen.findByRole("heading", { name: "Dataset Catalogue" });

    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response(null, { status: 401 }))),
    );
    await api.GET("/api/v1/organisations");

    expect(
      await screen.findByRole("link", { name: "Sign in" }),
    ).toHaveAttribute(
      "href",
      "/api/v1/auth/login?redirect=%2Forgs%2Fdemo%2Fcatalogue",
    );
  });
});
