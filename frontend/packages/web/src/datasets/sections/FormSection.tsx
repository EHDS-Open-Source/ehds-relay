import type { ReactNode } from "react";

import { sectionAnchorId, type SectionId } from "../fields";

/** One section of the dataset form: a heading the section menu can jump to, then its fields. */
export function FormSection({
  id,
  title,
  children,
}: {
  id: SectionId;
  title: string;
  children: ReactNode;
}) {
  const anchor = sectionAnchorId(id);
  return (
    <section
      id={anchor}
      tabIndex={-1}
      aria-labelledby={`${anchor}-title`}
      className="scroll-mt-24 rounded-3xl border bg-background/70 p-6 outline-none"
    >
      <h2
        id={`${anchor}-title`}
        className="mb-6 text-xl font-semibold tracking-tight"
      >
        {title}
      </h2>
      <div className="flex flex-col gap-8">{children}</div>
    </section>
  );
}
