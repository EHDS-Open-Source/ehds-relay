import { EmptyState } from "@ehds-relay/ui";
import { Link } from "@tanstack/react-router";

import { BareLayout } from "../shell/BareLayout";
import { shellMessages } from "../shell/messages";

/** Shown where a page is missing: inside the shell when an organisation is open. */
export function NotFound() {
  return (
    <EmptyState
      title={shellMessages.notFound.title}
      description={shellMessages.notFound.description}
      action={<Link to="/">{shellMessages.notFound.back}</Link>}
    />
  );
}

/** The same page, centred, for paths outside any organisation. */
export function BareNotFound() {
  return (
    <BareLayout>
      <NotFound />
    </BareLayout>
  );
}
