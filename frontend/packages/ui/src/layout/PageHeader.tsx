import type { ReactNode } from "react";

export interface PageHeaderProps {
  /** Small label above the title, e.g. the organisation name. */
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <div className="mb-10 flex flex-wrap items-start justify-between gap-6">
      <div>
        {eyebrow ? (
          <p className="mb-3 inline-block rounded-full bg-accent px-3 py-1 text-[11px] font-semibold tracking-wider text-accent-foreground">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-[560px] text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0 pt-2">{actions}</div> : null}
    </div>
  );
}
