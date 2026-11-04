import type { ReactNode } from "react";

import { cn } from "../lib/utils";

export interface PageHeaderProps {
  /** Context line above the title, e.g. the organisation name. */
  eyebrow?: string;
  title: string;
  /** Sits right after the title's last word and never wraps onto a line of its own, e.g. a dataset's star. */
  titleAdornment?: ReactNode;
  description?: string;
  actions?: ReactNode;
  /** More content under the title and description, e.g. a record's facts. */
  children?: ReactNode;
  /** `record` is the dataset record's hero: a larger context line and a narrower title. */
  variant?: "page" | "record";
  /** Classes for the outer row, e.g. a page's own spacing below the header. */
  className?: string;
}

/** The title with its last word and the adornment kept together on one line. */
function TitleText({
  title,
  adornment,
}: {
  title: string;
  adornment?: ReactNode;
}) {
  if (!adornment) return <>{title}</>;
  const trimmed = title.trim();
  const split = trimmed.lastIndexOf(" ");
  const head = split === -1 ? "" : trimmed.slice(0, split + 1);
  const last = split === -1 ? trimmed : trimmed.slice(split + 1);
  return (
    <>
      {head}
      <span data-slot="title-tail" className="whitespace-nowrap">
        {last}
        <span className="ml-[0.16em] inline-block align-[0.02em] leading-none">
          {adornment}
        </span>
      </span>
    </>
  );
}

export function PageHeader({
  eyebrow,
  title,
  titleAdornment,
  description,
  actions,
  children,
  variant = "page",
  className,
}: PageHeaderProps) {
  const record = variant === "record";
  return (
    <div
      data-slot="page-header"
      className={cn(
        "mb-10 flex flex-wrap items-start justify-between",
        record ? "gap-12 max-md:flex-col" : "gap-6",
        className,
      )}
    >
      <div className={cn("min-w-0", record && "md:flex-1")}>
        {eyebrow ? (
          <p
            className={cn(
              "font-semibold text-blue",
              record ? "text-[1.15em]" : "mb-1 text-[1.1em]",
              "leading-[1.6]",
            )}
          >
            {eyebrow}
          </p>
        ) : null}
        {/* Focusable from script only, so a page can move focus here after navigating. */}
        <h1
          tabIndex={-1}
          className={cn(
            "font-bold tracking-[-0.015em] text-foreground outline-none md:text-[length:var(--h1-size)]",
            record ? "max-w-[34ch] text-[1.85em]" : "text-[length:2em]",
            "leading-[1.15]",
          )}
        >
          <TitleText title={title} adornment={titleAdornment} />
        </h1>
        {description ? (
          <p
            className={cn(
              "max-w-[72ch]",
              record ? "mt-6 text-[1em]" : "mt-4 text-[1.05em]",
              record ? "leading-[1.6]" : "leading-[1.75]",
            )}
          >
            {description}
          </p>
        ) : null}
        {children}
      </div>
      {actions ? (
        <div
          data-slot="page-actions"
          className={cn(
            "flex max-w-full shrink-0 flex-wrap items-center gap-3",
            record ? "max-md:w-full" : "pt-2",
          )}
        >
          {actions}
        </div>
      ) : null}
    </div>
  );
}
