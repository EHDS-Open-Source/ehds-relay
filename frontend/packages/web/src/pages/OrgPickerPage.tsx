import { Icon } from "@ehds-relay/ui";
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
    <BareLayout
      title={shellMessages.orgPicker.title}
      description={shellMessages.orgPicker.description}
      width="wide"
    >
      <ul className="flex flex-col">
        {orgs.map((org) => (
          <li key={org.id} className="border-b-2 border-white last:border-b-0">
            <Link
              to="/orgs/$orgId/catalogue"
              params={{ orgId: org.id }}
              className="group flex items-center justify-between gap-4 py-4"
            >
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-lg font-semibold break-words text-white">
                  {org.name}
                </span>
                <span className="flex items-center gap-1.5 text-sm font-semibold text-yellow">
                  <Icon name="pin" aria-hidden />
                  {countryName(org.country)}
                </span>
              </span>
              <span
                aria-hidden="true"
                className="flex size-[46px] shrink-0 items-center justify-center rounded-full bg-yellow text-blue transition-colors group-hover:bg-yellow-shade"
              >
                <Icon name="next" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <SignOutHint lead={shellMessages.orgPicker.signOutHint} />
    </BareLayout>
  );
}
