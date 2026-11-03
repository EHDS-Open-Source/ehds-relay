import { AppHeader, AppShell } from "@ehds-relay/ui";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { HealthStatus } from "../HealthStatus";
import { shellMessages } from "./messages";

/**
 * Header and content area for pages that belong to the user rather than to one organisation.
 * There is no organisation menu here, so it also works for someone with no organisation.
 */
export function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      header={
        <AppHeader
          logo={
            <Link to="/orgs" className="text-lg font-bold tracking-tight">
              {shellMessages.appName}
            </Link>
          }
          actions={<HealthStatus />}
        />
      }
    >
      {children}
    </AppShell>
  );
}
