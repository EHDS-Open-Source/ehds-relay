import { Icon } from "@ehds-relay/ui";
import { Link } from "@tanstack/react-router";

import { countryName } from "../orgs/countries";
import { useSession } from "../session/useSession";
import { BareLayout } from "../shell/BareLayout";
import { shellMessages } from "../shell/messages";
import { SignOutHint } from "./SignOutHint";

const text = shellMessages.orgPicker;

/** Only reached with two or more organisations; with 0 or 1 the route forwards. */
export function OrgPickerPage() {
  const orgs = useSession()?.orgs ?? [];

  return (
    <BareLayout
      title={text.title}
      description={
        <>
          {text.description.lead}
          <strong>{text.description.strong}</strong>
        </>
      }
      width="wide"
      below={<SignOutHint lead={text.signOutHint} />}
    >
      {/* Each row is one link with a 2px white rule under it, the last one included. */}
      <ul className="flex flex-col">
        {orgs.map((org) => (
          <li key={org.id}>
            <Link
              to="/orgs/$orgId/catalogue"
              params={{ orgId: org.id }}
              data-slot="org-row"
              className="group flex items-center justify-between gap-5 border-b-2 border-white py-6 transition-colors hover:border-yellow focus-visible:outline-offset-[6px]"
            >
              <span className="flex min-w-0 flex-col gap-1">
                <span
                  data-slot="org-name"
                  className="text-[1.05em] leading-[1.35] font-semibold break-words text-white md:text-[1.2em]"
                >
                  {org.name}
                </span>
                <span
                  data-slot="org-country"
                  className="flex items-center gap-2 text-[1.02em] font-medium text-yellow"
                >
                  <Icon name="pin" aria-hidden />
                  {countryName(org.country)}
                </span>
              </span>
              <span
                aria-hidden="true"
                data-slot="org-arrow"
                className="flex size-[46px] shrink-0 items-center justify-center rounded-full bg-yellow text-blue transition-colors group-hover:bg-white"
              >
                <Icon name="next" size="sm" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </BareLayout>
  );
}
