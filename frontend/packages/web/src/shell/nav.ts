import type { NavItem } from "@ehds-relay/ui";

import type { OrgRole } from "../session/types";

// Menu entries as plain data, so extensions can append to them later.
// `$orgId` in `to` is filled in from the current organisation when the link is rendered.

export type OrgNavPath =
  "/orgs/$orgId/catalogue" | "/orgs/$orgId/members" | "/orgs/$orgId/settings";

export const coreNavItems: readonly NavItem<OrgNavPath>[] = [
  {
    id: "catalogue",
    label: "Catalogue",
    to: "/orgs/$orgId/catalogue",
    icon: "file",
  },
  {
    id: "members",
    label: "Manage users",
    icon: "person",
    to: "/orgs/$orgId/members",
    requires: "owner",
  },
  {
    id: "settings",
    label: "Settings",
    icon: "orgChart",
    to: "/orgs/$orgId/settings",
    requires: "owner",
  },
];

/** Menu destinations outside any organisation. */
export type RootNavPath = "/orgs" | "/account";

export const accountNavItems: readonly NavItem<RootNavPath>[] = [
  {
    id: "account",
    label: "Manage my account",
    to: "/account",
    icon: "account",
  },
  {
    id: "switch-organisation",
    label: "Switch organisation",
    to: "/orgs",
    icon: "switch",
  },
];

export const navLabels = {
  main: "Main",
} as const;

export type MenuNavPath = OrgNavPath | RootNavPath;

export function isOrgNavPath(to: MenuNavPath): to is OrgNavPath {
  return to.startsWith("/orgs/$orgId/");
}

/**
 * The menu as one list: the catalogue, the account, the organisation's management pages
 * (for its owners), then Switch organisation (only with more than one organisation).
 * Without an organisation only the account entries remain.
 */
export function menuNavItems({
  role,
  orgCount,
}: {
  /** The user's role in the current organisation, if there is one. */
  role?: OrgRole;
  orgCount: number;
}): NavItem<MenuNavPath>[] {
  const [catalogue, ...manage] = coreNavItems.filter(
    (item) => role && (!item.requires || item.requires === role),
  );
  const [account, switchOrg] = accountNavItems;
  return [
    ...(catalogue ? [catalogue] : []),
    account!,
    ...manage,
    ...(orgCount > 1 ? [switchOrg!] : []),
  ];
}

/**
 * The item whose page the visitor is on. Below an organisation a page under an item's path
 * counts too; the other items only match their own address.
 */
export function activeNavId(
  items: readonly NavItem<MenuNavPath>[],
  orgId: string | undefined,
  pathname: string,
): string | undefined {
  return items.find((item) => {
    if (!isOrgNavPath(item.to)) return pathname === item.to;
    if (orgId === undefined) return false;
    const path = item.to.replace("$orgId", encodeURIComponent(orgId));
    return pathname === path || pathname.startsWith(`${path}/`);
  })?.id;
}
