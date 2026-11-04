import type { ReactNode } from "react";

import { sectionAnchorId, type SectionId } from "../fields";

/**
 * One section of the dataset form: a blue heading the section menu can jump to, then its
 * fields 24px apart. The form keeps sections 48px apart.
 */
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
      className="scroll-mt-24 outline-none"
    >
      <h2
        id={`${anchor}-title`}
        className="mb-6 text-[length:var(--h3-size)] leading-[1.3] font-bold text-blue"
      >
        {title}
      </h2>
      <div className="flex flex-col gap-6">{children}</div>
    </section>
  );
}
