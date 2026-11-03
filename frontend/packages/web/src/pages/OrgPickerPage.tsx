import { PageHeader } from "@ehds-relay/ui";
import { Link } from "@tanstack/react-router";

import { useSession } from "../session/useSession";
import { BareLayout } from "../shell/BareLayout";
import { shellMessages } from "../shell/messages";

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
              className="block rounded-2xl border bg-background px-4 py-3 font-medium hover:bg-accent"
            >
              {org.name}
            </Link>
          </li>
        ))}
      </ul>
    </BareLayout>
  );
}
