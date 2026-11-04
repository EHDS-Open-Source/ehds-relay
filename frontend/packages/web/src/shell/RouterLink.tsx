import type { RenderNavLink } from "@ehds-relay/ui";
import { Link } from "@tanstack/react-router";

import {
  isOrgNavPath,
  type MenuNavPath,
  type OrgNavPath,
  type RootNavPath,
} from "./nav";

/** Renders a menu item as a router link inside the given organisation. */
export function renderOrgLink(orgId: string): RenderNavLink<OrgNavPath> {
  return ({ item, children, className, onClick, "aria-current": current }) => (
    <Link
      to={item.to}
      params={{ orgId }}
      className={className}
      onClick={onClick}
      aria-current={current}
    >
      {children}
    </Link>
  );
}

/** Renders a menu item that goes to a page outside any organisation. */
export const renderRootLink: RenderNavLink<RootNavPath> = ({
  item,
  children,
  className,
  onClick,
  "aria-current": current,
}) => (
  <Link
    to={item.to}
    className={className}
    onClick={onClick}
    aria-current={current}
  >
    {children}
  </Link>
);

/** Renders a menu item of either kind; organisation items need `orgId` and are left out without one. */
export function renderMenuLink(
  orgId: string | undefined,
): RenderNavLink<MenuNavPath> {
  return (props) => {
    const { item } = props;
    const { to } = item;
    if (isOrgNavPath(to)) {
      return orgId === undefined
        ? null
        : renderOrgLink(orgId)({ ...props, item: { ...item, to } });
    }
    return renderRootLink({ ...props, item: { ...item, to } });
  };
}
