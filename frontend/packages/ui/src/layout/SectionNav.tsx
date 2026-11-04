import type { MouseEvent } from "react";

import { cn, scrollBehavior } from "../lib/utils";

export interface SectionNavItem {
  /** Id of the section element on the page. */
  id: string;
  label: string;
}

export interface SectionNavProps {
  sections: readonly SectionNavItem[];
  /** Accessible name for the navigation landmark, e.g. "Sections". */
  label: string;
  /** Id of the section to highlight. */
  activeId?: string;
}

/** Scrolls to an element and moves keyboard focus to it (it needs `tabIndex={-1}`). */
export function jumpTo(id: string): void {
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView?.({ behavior: scrollBehavior(), block: "start" });
  target.focus({ preventScroll: true });
}

/**
 * An in-page menu of sections: each entry jumps to its section and moves focus there, so
 * keyboard and screen reader users land in the right place too. A 260px sticky sidebar on
 * wide screens and a scrolling strip along the top on phones.
 */
export function SectionNav({ sections, label, activeId }: SectionNavProps) {
  function onClick(event: MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault();
    jumpTo(id);
  }
  return (
    <nav
      aria-label={label}
      className="sticky top-0 z-10 -mx-1 bg-white px-1 py-2 md:top-24 md:z-auto md:mx-0 md:w-[260px] md:shrink-0 md:bg-transparent md:p-0"
    >
      <ul className="flex gap-1 overflow-x-auto md:flex-col md:gap-0.5 md:overflow-visible">
        {sections.map((section) => {
          const active = section.id === activeId;
          return (
            <li key={section.id} className="shrink-0">
              <a
                href={`#${section.id}`}
                className={cn(
                  "flex items-center gap-2.5 rounded-full px-4 py-2.5 text-[0.95em] font-medium whitespace-nowrap transition-colors md:w-full",
                  active
                    ? "bg-blue text-white"
                    : "text-ink hover:bg-blue-tint-90 hover:text-blue",
                )}
                aria-current={active ? "location" : undefined}
                onClick={(event) => onClick(event, section.id)}
              >
                {active ? (
                  <span
                    aria-hidden="true"
                    data-slot="active-dot"
                    className="size-2 shrink-0 rounded-full bg-yellow"
                  />
                ) : null}
                {section.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
