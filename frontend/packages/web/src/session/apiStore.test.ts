import { createApiClient } from "@ehds-relay/api-client";
import { describe, expect, it, vi } from "vitest";

import { createApiSessionStore } from "./apiStore";
import { demoSession } from "./testing";

type Handler = (request: Request) => Response;

function setup(handler: Handler) {
  const fetch = vi.fn<(request: Request) => Promise<Response>>((request) =>
    Promise.resolve(handler(request)),
  );
  const store = createApiSessionStore(createApiClient({ fetch }));
  return { store, fetch };
}

const signedIn: Handler = (request) => {
  const path = new URL(request.url).pathname;
  if (path === "/api/v1/me") return Response.json(demoSession.user);
  if (path === "/api/v1/organisations") return Response.json(demoSession.orgs);
  if (path === "/api/v1/auth/logout") {
    return Response.json({ redirect_url: "https://idp.test/out" });
  }
  return new Response(null, { status: 404 });
};

describe("createApiSessionStore", () => {
  it("loads the user and organisations once", async () => {
    const { store, fetch } = setup(signedIn);
    expect(await store.load()).toEqual(demoSession);
    expect(await store.load()).toEqual(demoSession);
    expect(store.get()).toEqual(demoSession);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("treats a 401 as signed out", async () => {
    const { store } = setup(() => new Response(null, { status: 401 }));
    expect(await store.load()).toBeNull();
    expect(store.get()).toBeNull();
  });

  it("throws on any other failure and tries again next time", async () => {
    let fail = true;
    const { store } = setup((request) =>
      fail ? new Response(null, { status: 500 }) : signedIn(request),
    );
    await expect(store.load()).rejects.toThrow();
    fail = false;
    expect(await store.load()).toEqual(demoSession);
  });

  it("reloads on refresh and tells subscribers", async () => {
    const { store, fetch } = setup(signedIn);
    const listener = vi.fn();
    store.subscribe(listener);
    await store.load();
    await store.refresh();
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("signs out with the API and returns the provider address", async () => {
    const { store, fetch } = setup(signedIn);
    await store.load();
    expect(await store.signOut()).toBe("https://idp.test/out");
    expect(store.get()).toBeNull();
    const logout = fetch.mock.calls.at(-1)![0];
    expect(logout.method).toBe("POST");
    expect(logout.headers.get("X-Requested-By")).toBe("ehds-relay");
  });

  it("still clears the session when sign-out fails", async () => {
    const { store } = setup((request) =>
      request.method === "POST"
        ? new Response(null, { status: 500 })
        : signedIn(request),
    );
    await store.load();
    expect(await store.signOut()).toBeNull();
    expect(store.get()).toBeNull();
  });
});
