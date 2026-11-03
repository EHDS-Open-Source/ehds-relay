import { PageHeader } from "@ehds-relay/ui";
import { Link } from "@tanstack/react-router";

import { countryName } from "../orgs/countries";
import { useSession } from "../session/useSession";
import { BareLayout } from "../shell/BareLayout";
import { shellMessages } from "../shell/messages";
import { SignOutHint } from "./SignOutHint";

/** Only reached with two or more organisations; with 0 or 1 the route forwards. */
export function OrgPickerPage() {
  const orgs = useSession()?.orgs ?? [];

  return (
    <BareLayout>
      <PageHeader
        title={shellMessages.orgPicker.title}
        description={shellMessages.orgPicker.description}
      />
      <ul className="flex flex-col gap-2">
        {orgs.map((org) => (
          <li key={org.id}>
            <Link
              to="/orgs/$orgId/catalogue"
              params={{ orgId: org.id }}
              className="flex items-baseline justify-between gap-4 rounded-2xl border bg-background px-4 py-3 hover:bg-accent"
            >
              <span className="font-medium">{org.name}</span>
              <span className="text-sm text-muted-foreground">
                {countryName(org.country)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <SignOutHint lead={shellMessages.orgPicker.signOutHint} />
    </BareLayout>
  );
}
