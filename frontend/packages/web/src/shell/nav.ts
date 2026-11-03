import type { NavItem } from "@ehds-relay/ui";

// Menu entries as plain data, so extensions can append to them later.
// `$orgId` in `to` is filled in from the current organisation when the link is rendered.

export type OrgNavPath =
  "/orgs/$orgId/catalogue" | "/orgs/$orgId/members" | "/orgs/$orgId/settings";

export const coreNavItems: readonly NavItem<OrgNavPath>[] = [
  { id: "catalogue", label: "Catalogue", to: "/orgs/$orgId/catalogue" },
  {
    id: "members",
    label: "Members",
    to: "/orgs/$orgId/members",
    requires: "owner",
  },
  { id: "settings", label: "Settings", to: "/orgs/$orgId/settings" },
];

/** Menu destinations outside any organisation. */
export type RootNavPath = "/orgs" | "/account";

export const accountNavItems: readonly NavItem<RootNavPath>[] = [
  { id: "account", label: "Manage my account", to: "/account" },
  { id: "switch-organisation", label: "Switch organisation", to: "/orgs" },
];

export const navLabels = {
  main: "Organisation",
  account: "Account",
} as const;

/** The item whose page the visitor is on (a page below an item's path counts too). */
export function activeNavId(
  items: readonly NavItem<OrgNavPath>[],
  orgId: string,
  pathname: string,
): string | undefined {
  return items.find((item) => {
    const path = item.to.replace("$orgId", encodeURIComponent(orgId));
    return pathname === path || pathname.startsWith(`${path}/`);
  })?.id;
}
