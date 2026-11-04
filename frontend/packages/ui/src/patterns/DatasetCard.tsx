import type { ReactNode } from "react";

import { Icon } from "../icons";
import { messages } from "../messages";

export interface DatasetCardProps {
  title: string;
  description?: string;
  /** Colour of the card star, from the dataset's place in the catalogue. */
  starColour?: string;
  /** Shows the Draft chip. */
  draft?: boolean;
  draftLabel?: string;
  /** The dataset is due for revalidation: the footer says so. */
  overdue?: boolean;
  overdueLabel?: string;
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
  className: string;
}) {
  return (
    <Icon
      name="star"
      className={className}
      style={{ width: 26, height: 26, color: colour }}
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
  reminderDate,
  reminderLabel = messages.datasetCard.reminder,
  renderLink,
}: DatasetCardProps) {
  const band = overdue || Boolean(reminderDate);
  return (
    <li className="list-none">
      {renderLink({
        className:
          "group relative flex h-full flex-col rounded-card bg-white text-ink shadow-card transition-shadow outline-none hover:shadow-card-hover focus-visible:shadow-card-hover",
        children: (
          <>
            <span
              className={`flex flex-1 flex-col gap-4 p-8 ${band ? "" : "pb-14"}`}
            >
              <span className="flex items-start justify-between gap-3">
                <span
                  role="heading"
                  aria-level={2}
                  className="text-[length:var(--h4-size)] leading-[1.3] font-bold text-blue"
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
                <span className="line-clamp-4 text-[0.94em] leading-[1.6] text-ink">
                  {description}
                </span>
              ) : null}
            </span>
            {band ? (
              <span className="flex min-h-[62px] items-center justify-between gap-3 border-t border-blue-tint-95 px-8 py-3">
                <span
                  className={`flex items-center gap-2 text-[0.94em] font-semibold transition-colors ${
                    overdue
                      ? "text-destructive"
                      : "text-blue-hint group-hover:text-blue group-focus-visible:text-blue"
                  }`}
                >
                  <Icon name="calendar" />
                  <span>
                    {overdue ? (
                      <span>{overdueLabel}</span>
                    ) : (
                      <span className="sr-only">{reminderLabel} </span>
                    )}
                    {overdue && reminderDate ? " " : null}
                    {reminderDate ? <span>{reminderDate}</span> : null}
                  </span>
                </span>
                <CardStar colour={starColour} className="" />
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
