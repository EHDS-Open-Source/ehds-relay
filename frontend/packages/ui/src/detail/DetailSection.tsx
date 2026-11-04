import type { ReactNode } from "react";

export interface DetailSectionProps {
  /** Id of the section, so it can be linked to. The heading gets `<id>-heading`. */
  id?: string;
  title: string;
  children: ReactNode;
}

/**
 * A titled group of fields on a record: a blue tab sitting on a one-column table. One soft
 * shadow (a `drop-shadow` filter) goes round the tab and the table together.
 */
export function DetailSection({ id, title, children }: DetailSectionProps) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      data-slot="detail-section"
      className="mb-10 max-w-[1280px] filter-(--shadow-section) md:mb-12"
    >
      <h2
        id={headingId}
        className="inline-block rounded-t-[10px] bg-blue px-6 py-4 text-[1.1em] leading-[1.3] font-bold text-white"
      >
        {title}
      </h2>
      {/* The 1px gap shows the table's pale background as the rule between rows. */}
      <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-card rounded-tl-none border border-blue-tint-95 bg-blue-tint-95">
        {children}
      </dl>
    </section>
  );
}
