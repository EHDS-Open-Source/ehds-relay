import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Vitest globals are off, so Testing Library can't register its own cleanup.
afterEach(cleanup);

// The router scrolls to the top on navigation; jsdom does not implement it.
window.scrollTo = () => {};

// The shell header shows the API health; give it a healthy API by default.
// Tests that care about other responses pass their own client or stub fetch.
vi.stubGlobal(
  "fetch",
  vi.fn((input: RequestInfo | URL) => {
    const url = input instanceof Request ? input.url : String(input);
    // The catalogue lists datasets, the members page lists members and invitations;
    // an empty organisation by default.
    const isList =
      url.includes("/datasets") || /\/(members|invitations)(\?|$)/.test(url);
    const body = isList ? [] : { status: "ok" };
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        headers: { "Content-Type": "application/json" },
      }),
    );
  }),
);
