import type { ReactNode } from "react";

export interface DetailSectionProps {
  /** Id of the heading, so the section can be linked to. */
  id?: string;
  title: string;
  children: ReactNode;
}

/** A titled group of fields on a record. */
export function DetailSection({ id, title, children }: DetailSectionProps) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className="mb-8">
      <h2
        id={headingId}
        className="mb-4 border-b pb-2 text-lg font-semibold tracking-tight"
      >
        {title}
      </h2>
      <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">{children}</dl>
    </section>
  );
}
