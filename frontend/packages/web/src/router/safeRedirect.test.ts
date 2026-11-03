import { describe, expect, it } from "vitest";

import { safeRedirect } from "./safeRedirect";

describe("safeRedirect", () => {
  it("keeps paths on this site", () => {
    expect(safeRedirect("/orgs/demo/members?tab=1#top")).toBe(
      "/orgs/demo/members?tab=1#top",
    );
  });

  it("falls back to the home page for anything else", () => {
    expect(safeRedirect(undefined)).toBe("/");
    expect(safeRedirect("https://evil.example/")).toBe("/");
    expect(safeRedirect("//evil.example/")).toBe("/");
    expect(safeRedirect("orgs/demo")).toBe("/");
    expect(safeRedirect("/\\evil.example")).toBe("/");
    expect(safeRedirect("/orgs\n/x")).toBe("/");
    expect(safeRedirect("/orgs\t/x")).toBe("/");
  });
});
