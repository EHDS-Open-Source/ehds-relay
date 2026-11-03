import type { RenderNavLink } from "@ehds-relay/ui";
import { Link } from "@tanstack/react-router";

import type { OrgNavPath, RootNavPath } from "./nav";

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
