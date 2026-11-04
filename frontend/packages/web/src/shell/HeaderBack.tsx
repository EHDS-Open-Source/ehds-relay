import { Icon, buttonVariants } from "@ehds-relay/ui";
import { Link } from "@tanstack/react-router";

import { shellMessages } from "./messages";

const className = buttonVariants({
  variant: "secondary",
  size: "sm",
  surface: "blue",
});

function Content() {
  return (
    <>
      <Icon
        name="back"
        className="text-yellow"
        style={{ width: 18, height: 18 }}
      />
      <span className="max-md:hidden">
        {shellMessages.header.backToCatalogue}
      </span>
      <span className="md:hidden">
        {shellMessages.header.backToCatalogueShort}
      </span>
    </>
  );
}

/**
 * "Back to catalogue" for the header, outlined on blue with a yellow arrow; "Catalogue" on
 * phones. Goes to the organisation's catalogue, or to the organisation list without one.
 */
export function BackToCatalogue({ orgId }: { orgId?: string }) {
  return orgId === undefined ? (
    <Link
      to="/orgs"
      className={className}
      aria-label={shellMessages.header.backToCatalogue}
    >
      <Content />
    </Link>
  ) : (
    <Link
      to="/orgs/$orgId/catalogue"
      params={{ orgId }}
      className={className}
      aria-label={shellMessages.header.backToCatalogue}
    >
      <Content />
    </Link>
  );
}
