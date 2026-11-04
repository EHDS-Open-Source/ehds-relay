import { describe, expect, it } from "vitest";

import {
  accountNavItems,
  activeNavId,
  coreNavItems,
  menuNavItems,
} from "./nav";

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

describe("menu entries", () => {
  it("each has an icon", () => {
    for (const item of [...coreNavItems, ...accountNavItems]) {
      expect(item.icon, item.id).toBeDefined();
    }
  });
});

describe("menuNavItems", () => {
  const ids = (items: { id: string }[]) => items.map((item) => item.id);

  it("puts the account before the owner pages and Switch organisation last", () => {
    expect(ids(menuNavItems({ role: "owner", orgCount: 2 }))).toEqual([
      "catalogue",
      "account",
      "members",
      "settings",
      "switch-organisation",
    ]);
  });

  it("leaves out owner pages and Switch organisation when they do not apply", () => {
    expect(ids(menuNavItems({ role: "standard", orgCount: 1 }))).toEqual([
      "catalogue",
      "account",
    ]);
  });

  it("keeps only the account entries without an organisation", () => {
    expect(ids(menuNavItems({ orgCount: 0 }))).toEqual(["account"]);
  });
});

describe("activeNavId outside an organisation", () => {
  it("matches the account page exactly", () => {
    const items = menuNavItems({ orgCount: 2 });
    expect(activeNavId(items, undefined, "/account")).toBe("account");
    expect(activeNavId(items, undefined, "/orgs/demo")).toBeUndefined();
  });
});
