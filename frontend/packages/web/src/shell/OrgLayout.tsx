import { AppHeader, AppShell } from "@ehds-relay/ui";
import { Link, Outlet, useLocation, useParams } from "@tanstack/react-router";
import { useState } from "react";

import { useSession } from "../session/useSession";
import { BackToCatalogue } from "./HeaderBack";
import { LeaveGuardProvider } from "./leaveGuard";
import { Logo } from "./Logo";
import { RibbonSlot, RibbonSlotProvider } from "./RibbonSlot";
import { ShellMenu } from "./ShellMenu";

/** Header, menu panel and content area for everything inside one organisation. */
export function OrgLayout() {
  const { orgId } = useParams({ from: "/orgs/$orgId" });
  const pathname = useLocation({ select: (location) => location.pathname });
  const session = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  const org = session?.orgs.find((candidate) => candidate.id === orgId);
  // Signing out empties the session before the redirect to /sign-in finishes.
  if (!org) return null;

  // Every page but the catalogue itself offers the way back to it in the header.
  const catalogue = `/orgs/${encodeURIComponent(orgId)}/catalogue`;
  const onCatalogue = pathname === catalogue || pathname === `${catalogue}/`;

  return (
    <LeaveGuardProvider>
      <RibbonSlotProvider>
        <AppShell
          ribbon={<RibbonSlot />}
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
              actions={
                onCatalogue ? undefined : <BackToCatalogue orgId={orgId} />
              }
              menuOpen={menuOpen}
              onMenuClick={() => {
                setMenuOpen(true);
              }}
            />
          }
        >
          <ShellMenu open={menuOpen} onOpenChange={setMenuOpen} org={org} />
          <Outlet />
        </AppShell>
      </RibbonSlotProvider>
    </LeaveGuardProvider>
  );
}
