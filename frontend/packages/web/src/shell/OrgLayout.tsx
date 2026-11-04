import {
  AppHeader,
  Button,
  Icon,
  AppShell,
  NavList,
  SideMenu,
  SideMenuDivider,
} from "@ehds-relay/ui";
import { Link, Outlet, useLocation, useParams } from "@tanstack/react-router";
import { useState } from "react";

import { HealthStatus } from "../HealthStatus";

import { useSession, useSignOut } from "../session/useSession";
import { shellMessages } from "./messages";
import { accountNavItems, activeNavId, coreNavItems, navLabels } from "./nav";
import { Logo } from "./Logo";
import { renderOrgLink, renderRootLink } from "./RouterLink";

/** Header, menu panel and content area for everything inside one organisation. */
export function OrgLayout() {
  const { orgId } = useParams({ from: "/orgs/$orgId" });
  const pathname = useLocation({ select: (location) => location.pathname });
  const session = useSession();
  const signOutAndLeave = useSignOut();
  const [menuOpen, setMenuOpen] = useState(false);

  const org = session?.orgs.find((candidate) => candidate.id === orgId);
  // Signing out empties the session before the redirect to /sign-in finishes.
  if (!org) return null;

  const items = coreNavItems.filter(
    (item) => !item.requires || item.requires === org.role,
  );
  // Choosing between organisations only makes sense with more than one.
  const accountItems = accountNavItems.filter(
    (item) =>
      item.id !== "switch-organisation" || (session?.orgs.length ?? 0) > 1,
  );
  const closeMenu = () => {
    setMenuOpen(false);
  };
  const signOut = () => {
    closeMenu();
    void signOutAndLeave();
  };

  return (
    <AppShell
      header={
        <AppHeader
          logo={
            <Link
              to="/orgs/$orgId/catalogue"
              params={{ orgId }}
              className="no-underline"
            >
              <Logo />
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
        footer={<HealthStatus className="text-white" />}
      >
        <NavList
          label={navLabels.main}
          items={items}
          activeId={activeNavId(items, orgId, pathname)}
          renderLink={renderOrgLink(orgId)}
          onNavigate={closeMenu}
        />
        <SideMenuDivider />
        {accountItems.length > 0 ? (
          <NavList
            label={navLabels.account}
            items={accountItems}
            renderLink={renderRootLink}
            onNavigate={closeMenu}
          />
        ) : null}
        <Button
          type="button"
          size="lg"
          onBlue
          className="self-start"
          onClick={signOut}
        >
          {shellMessages.logOut}
          <Icon name="logOut" size="xl" />
        </Button>
      </SideMenu>
      <Outlet />
    </AppShell>
  );
}
