import type { ReactNode } from "react";

import { Icon } from "../icons";
import { cn } from "../lib/utils";
import { messages } from "../messages";

export interface DatasetCardProps {
  title: string;
  description?: string;
  /** Colour of the card star, the same one the dataset's record uses. */
  starColour?: string;
  /** Shows the Draft chip. */
  draft?: boolean;
  draftLabel?: string;
  /**
   * Due for revalidation: the footer turns yellow and says "Overdue", followed by
   * `reminderDate` when that is the date that passed.
   */
  overdue?: boolean;
  /** The visible word in the overdue footer. */
  overdueLabel?: string;
  /** What screen readers hear instead of `overdueLabel` when a date follows. */
  overdueSinceLabel?: string;
  /** The reminder date, already formatted for people. Adds the footer band. */
  reminderDate?: string;
  /** Read out before the date, e.g. "Revalidation due". */
  reminderLabel?: string;
  /**
   * Renders the link around the card content, so the app picks the router.
   * Receives the class names to put on the link.
   */
  renderLink: (props: { className: string; children: ReactNode }) => ReactNode;
}

function CardStar({
  colour,
  className,
}: {
  colour: string;
  className?: string;
}) {
  return (
    <Icon
      name="star"
      size="lg"
      data-card-star=""
      className={className}
      style={{ color: colour }}
    />
  );
}

/** One catalogue entry: a list item whose whole body is a link. */
export function DatasetCard({
  title,
  description,
  starColour = "var(--blue-tint-80)",
  draft = false,
  draftLabel = messages.datasetCard.draft,
  overdue = false,
  overdueLabel = messages.datasetCard.overdue,
  overdueSinceLabel = messages.datasetCard.overdueSince,
  reminderDate,
  reminderLabel = messages.datasetCard.reminder,
  renderLink,
}: DatasetCardProps) {
  const band = overdue || Boolean(reminderDate);
  const late = overdue;
  return (
    <li className="min-w-0 list-none">
      {renderLink({
        className: cn(
          // Hover draws the blue ring; keyboard focus draws the outline, away from the card.
          "group relative flex h-full min-w-0 flex-col rounded-card bg-white px-6 pt-6 text-ink md:px-8 md:pt-8 shadow-card transition-shadow hover:shadow-card-hover focus-visible:outline-offset-4",
          band ? "overflow-hidden" : "pb-14",
        ),
        children: (
          <>
            <span className="mb-4 flex min-w-0 items-start justify-between gap-3">
              <span
                role="heading"
                aria-level={2}
                className="min-w-0 text-[1.1em] leading-[1.3] font-bold tracking-[-0.005em] [overflow-wrap:anywhere] text-blue"
              >
                {title}
              </span>
              {draft ? (
                <span className="shrink-0 rounded-full bg-blue-tint-90 px-3 py-0.5 text-[0.85em] font-semibold text-blue">
                  {draftLabel}
                </span>
              ) : null}
            </span>
            {description ? (
              <span
                data-card-description=""
                className={cn(
                  "line-clamp-4 text-[0.94em] leading-[1.6] [overflow-wrap:anywhere] text-ink",
                  band && "mb-6",
                )}
              >
                {description}
              </span>
            ) : null}
            {band ? (
              <span
                data-band={late ? "overdue" : "reminder"}
                className={cn(
                  "-mx-6 mt-auto flex min-h-[62px] items-center gap-4 border-t py-4 pr-5 pl-6 leading-[1.2] md:-mx-8 md:pl-8 transition-colors",
                  late
                    ? "border-transparent bg-yellow font-bold text-blue"
                    : "border-blue-tint-95 font-semibold text-blue-hint group-hover:text-blue group-focus-visible:text-blue",
                )}
              >
                <Icon name={late ? "calendarAlert" : "calendarUpdate"} />
                <span>
                  {late && reminderDate ? (
                    <>
                      <span aria-hidden="true" className="mr-[0.25em]">
                        {overdueLabel}
                      </span>{" "}
                      <span className="sr-only">{overdueSinceLabel} </span>
                    </>
                  ) : late ? (
                    overdueLabel
                  ) : (
                    <span className="sr-only">{reminderLabel} </span>
                  )}
                  {reminderDate}
                </span>
                <CardStar
                  colour={late ? "var(--blue)" : starColour}
                  className="ml-auto"
                />
              </span>
            ) : (
              <CardStar
                colour={starColour}
                className="absolute right-5 bottom-5"
              />
            )}
          </>
        ),
      })}
    </li>
  );
}
