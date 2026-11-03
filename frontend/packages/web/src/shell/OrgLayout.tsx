import {
  AppHeader,
  AppShell,
  NavList,
  SideMenu,
  SideMenuDivider,
  SideMenuItem,
} from "@ehds-relay/ui";
import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { useState } from "react";

import { useSession, useSessionStore } from "../session/useSession";
import { shellMessages } from "./messages";
import { accountNavItems, activeNavId, coreNavItems, navLabels } from "./nav";
import { renderOrgLink, renderRootLink } from "./RouterLink";

/** Header, `⋯` menu drawer and content area for everything inside one organisation. */
export function OrgLayout() {
  const { orgId } = useParams({ from: "/orgs/$orgId" });
  const pathname = useLocation({ select: (location) => location.pathname });
  const session = useSession();
  const store = useSessionStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const org = session?.orgs.find((candidate) => candidate.id === orgId);
  // Signing out empties the session before the redirect to /sign-in finishes.
  if (!org) return null;

  const items = coreNavItems.filter(
    (item) => !item.requires || item.requires === org.role,
  );
  const closeMenu = () => {
    setMenuOpen(false);
  };
  const signOut = () => {
    closeMenu();
    store.signOut();
    void navigate({ to: "/sign-in" });
  };

  return (
    <AppShell
      header={
        <AppHeader
          logo={
            <Link
              to="/orgs/$orgId/catalogue"
              params={{ orgId }}
              className="text-lg font-bold tracking-tight"
            >
              {shellMessages.appName}
            </Link>
          }
          orgName={org.name}
          menuOpen={menuOpen}
          onMenuClick={() => {
            setMenuOpen(true);
          }}
        />
      }
    >
      <SideMenu
        open={menuOpen}
        onOpenChange={setMenuOpen}
        title={shellMessages.menuTitle}
        description={org.name}
      >
        <NavList
          label={navLabels.main}
          items={items}
          activeId={activeNavId(items, orgId, pathname)}
          renderLink={renderOrgLink(orgId)}
          onNavigate={closeMenu}
        />
        <SideMenuDivider />
        <NavList
          label={navLabels.account}
          items={accountNavItems}
          renderLink={renderRootLink}
          onNavigate={closeMenu}
        />
        <SideMenuItem danger onClick={signOut}>
          {shellMessages.signOut}
        </SideMenuItem>
      </SideMenu>
      <Outlet />
    </AppShell>
  );
}
