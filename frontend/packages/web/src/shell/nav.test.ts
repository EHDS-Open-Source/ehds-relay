import { describe, expect, it } from "vitest";

import { activeNavId, coreNavItems } from "./nav";

describe("activeNavId", () => {
  it("matches an item's own path", () => {
    expect(activeNavId(coreNavItems, "demo", "/orgs/demo/members")).toBe(
      "members",
    );
  });

  it("matches a page below an item's path", () => {
    expect(
      activeNavId(coreNavItems, "demo", "/orgs/demo/settings/billing"),
    ).toBe("settings");
  });

  it("does not match a path that only shares a prefix", () => {
    expect(
      activeNavId(coreNavItems, "demo", "/orgs/demo/membership"),
    ).toBeUndefined();
  });

  it("does not match another organisation", () => {
    expect(
      activeNavId(coreNavItems, "demo", "/orgs/other/catalogue"),
    ).toBeUndefined();
  });
});
