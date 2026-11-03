import type { ReactNode } from "react";

import { messages } from "../messages";

export interface DatasetCardProps {
  title: string;
  description?: string;
  /** Shows the Draft chip. */
  draft?: boolean;
  draftLabel?: string;
  /**
   * Renders the link around the card content, so the app picks the router.
   * Receives the class names to put on the link.
   */
  renderLink: (props: { className: string; children: ReactNode }) => ReactNode;
}

/** One catalogue entry: a list item whose whole body is a link. */
export function DatasetCard({
  title,
  description,
  draft = false,
  draftLabel = messages.datasetCard.draft,
  renderLink,
}: DatasetCardProps) {
  return (
    <li className="list-none">
      {renderLink({
        className:
          "flex h-full flex-col gap-3 rounded-2xl border bg-card p-5 text-card-foreground transition-shadow outline-none hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50",
        children: (
          <>
            <span className="flex items-start justify-between gap-3">
              <span className="text-base font-semibold tracking-tight">
                {title}
              </span>
              {draft ? (
                <span className="shrink-0 rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
                  {draftLabel}
                </span>
              ) : null}
            </span>
            {description ? (
              <span className="line-clamp-2 text-sm text-muted-foreground">
                {description}
              </span>
            ) : null}
          </>
        ),
      })}
    </li>
  );
}
