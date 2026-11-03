import type { MouseEvent } from "react";

import { menuItemClass } from "./SideMenu";

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
  target.scrollIntoView?.({ behavior: "smooth", block: "start" });
  target.focus({ preventScroll: true });
}

/**
 * An in-page menu of sections: each entry jumps to its section and moves focus there, so
 * keyboard and screen reader users land in the right place too. Sticky on wide screens.
 */
export function SectionNav({ sections, label, activeId }: SectionNavProps) {
  function onClick(event: MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault();
    jumpTo(id);
  }
  return (
    <nav aria-label={label} className="lg:sticky lg:top-24">
      <ul className="flex flex-col gap-0.5">
        {sections.map((section) => {
          const active = section.id === activeId;
          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className={menuItemClass({ active })}
                aria-current={active ? "location" : undefined}
                onClick={(event) => onClick(event, section.id)}
              >
                {section.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
