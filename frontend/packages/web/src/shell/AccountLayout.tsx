import { AppHeader, AppShell } from "@ehds-relay/ui";
import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";

import { useSession } from "../session/useSession";
import { BackToCatalogue } from "./HeaderBack";
import { Logo } from "./Logo";
import { ShellMenu } from "./ShellMenu";

/**
 * Header, menu and content area for pages that belong to the user rather than to one
 * organisation. The menu has the account entries and Log out, so it also works for someone
 * with no organisation.
 */
export function AccountLayout({ children }: { children: ReactNode }) {
  const session = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const orgs = session?.orgs ?? [];
  // With one organisation the way back goes straight to its catalogue; with several to the
  // list to choose from; with none there is no catalogue to go back to.
  const back =
    orgs.length === 0 ? undefined : (
      <BackToCatalogue orgId={orgs.length === 1 ? orgs[0]!.id : undefined} />
    );

  return (
    <AppShell
      header={
        <AppHeader
          logo={
            <Link to="/orgs" className="no-underline">
              <Logo />
            </Link>
          }
          actions={back}
          menuOpen={menuOpen}
          onMenuClick={() => {
            setMenuOpen(true);
          }}
        />
      }
    >
      <ShellMenu open={menuOpen} onOpenChange={setMenuOpen} />
      {children}
    </AppShell>
  );
}
