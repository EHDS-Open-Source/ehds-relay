import { EmptyState, PageHeader } from "@ehds-relay/ui";

import { shellMessages } from "../shell/messages";

/** Heading plus a "not built yet" note, for screens that have a route but no content yet. */
export function PlaceholderPage({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <EmptyState
        title={shellMessages.notBuilt.title}
        description={shellMessages.notBuilt.description}
      />
    </>
  );
}
