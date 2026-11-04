import { useEffect, useRef, useState, type MouseEvent } from "react";

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
  /** Id of the section to highlight; `useActiveSection` follows the scroll position. */
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
 * The id of the section being read: the first of `ids` that crosses a band just under the
 * sticky header (from 140px down to 60% of the window). Keeps the last one while none does.
 */
export function useActiveSection(ids: readonly string[]): string | undefined {
  const [active, setActive] = useState<string | undefined>(ids[0]);
  const key = ids.join(" ");
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const list = key.split(" ");
    const crossing = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) crossing.add(entry.target.id);
          else crossing.delete(entry.target.id);
        }
        const first = list.find((id) => crossing.has(id));
        if (first) setActive(first);
      },
      { rootMargin: "-140px 0px -40% 0px" },
    );
    for (const id of list) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }
    return () => {
      observer.disconnect();
    };
  }, [key]);
  return active;
}

/**
 * An in-page menu of sections: each entry jumps to its section and moves focus there, so
 * keyboard and screen reader users land in the right place too. A 260px sticky sidebar with
 * a right border on wide screens; on phones a strip that sticks under the 64px header and
 * scrolls sideways. The active entry is a blue pill with a yellow dot.
 */
export function SectionNav({ sections, label, activeId }: SectionNavProps) {
  const list = useRef<HTMLUListElement>(null);

  // Keep the active entry in view when the strip scrolls sideways (phones)
  useEffect(() => {
    const strip = list.current;
    const item = strip?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!strip || !item || strip.scrollWidth <= strip.clientWidth) return;
    const left = item.offsetLeft - strip.offsetLeft;
    if (
      left < strip.scrollLeft ||
      left + item.offsetWidth > strip.scrollLeft + strip.clientWidth
    ) {
      strip.scrollTo?.({ left: Math.max(0, left - 12), behavior: "auto" });
    }
  }, [activeId]);

  function onClick(event: MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault();
    jumpTo(id);
  }
  return (
    <nav
      aria-label={label}
      className="sticky top-16 z-10 -mx-1 border-b border-line bg-white px-1 py-2 md:top-[72px] md:z-auto md:mx-0 md:w-[260px] md:shrink-0 md:border-b-0 md:bg-transparent md:px-0 md:pt-8 md:pb-6"
    >
      <ul
        ref={list}
        className="flex overflow-x-auto md:flex-col md:overflow-visible"
      >
        {sections.map((section) => {
          const active = section.id === activeId;
          return (
            <li key={section.id} className="shrink-0">
              <a
                href={`#${section.id}`}
                className={cn(
                  "mx-1 flex items-center gap-2.5 rounded-card px-4 py-3 text-[0.92em] leading-[1.4] whitespace-nowrap transition-colors md:mx-3 md:my-0.5 md:whitespace-normal",
                  active
                    ? "bg-blue font-semibold text-white"
                    : "font-medium text-ink hover:bg-blue-tint-95",
                )}
                aria-current={active ? "location" : undefined}
                onClick={(event) => onClick(event, section.id)}
              >
                <span
                  aria-hidden="true"
                  data-slot={active ? "active-dot" : "dot"}
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    active ? "bg-yellow" : "bg-ink-3",
                  )}
                />
                {section.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
