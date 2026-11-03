import { describe, expect, it } from "vitest";

import { loginUrl } from "./login";

describe("loginUrl", () => {
  it("carries the page to return to", () => {
    expect(loginUrl({ redirect: "/orgs/1/members" })).toBe(
      "/api/v1/auth/login?redirect=%2Forgs%2F1%2Fmembers",
    );
  });

  it("adds signup for registration", () => {
    expect(loginUrl({ redirect: "/orgs/new", signup: true })).toBe(
      "/api/v1/auth/login?redirect=%2Forgs%2Fnew&signup=true",
    );
  });

  it("returns home for anything that leaves the site", () => {
    expect(loginUrl({ redirect: "//evil.example" })).toBe(
      "/api/v1/auth/login?redirect=%2F",
    );
    expect(loginUrl()).toBe("/api/v1/auth/login?redirect=%2F");
  });
});
