import { useEffect, useRef, useState, type MouseEvent } from "react";

import { hitArea } from "../components/button";
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

const JUMP_EVENT = "section-nav-jump";

/**
 * Scrolls to an element and moves keyboard focus to it (it needs `tabIndex={-1}`). Tells
 * `useActiveSection` which section is the target, so the menu does not flick through the
 * sections passed on the way.
 */
export function jumpTo(id: string): void {
  const target = document.getElementById(id);
  if (!target) return;
  window.dispatchEvent(new CustomEvent(JUMP_EVENT, { detail: id }));
  target.scrollIntoView?.({ behavior: scrollBehavior(), block: "start" });
  target.focus({ preventScroll: true });
}

/**
 * The id of the section being read: the first of `ids` that crosses a band that starts just
 * under the pinned header and menu strip (read from the first section's scroll margin) and
 * ends at 60% of the window. Keeps the last one while none does. After `jumpTo` the target
 * stays active until the page stops scrolling.
 */
export function useActiveSection(ids: readonly string[]): string | undefined {
  const [active, setActive] = useState<string | undefined>(ids[0]);
  const key = ids.join(" ");
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const list = key.split(" ");
    const crossing = new Set<string>();
    let locked = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const unlock = () => {
      clearTimeout(timer);
      locked = false;
    };
    const onJump = (event: Event) => {
      locked = true;
      setActive((event as CustomEvent<string>).detail);
      clearTimeout(timer);
      // Fallback for browsers without `scrollend`, and for a jump that does not scroll
      timer = setTimeout(unlock, 1000);
    };
    // Each scroll event pushes the fallback out, so a long smooth scroll is not cut short
    const onScroll = () => {
      if (!locked) return;
      clearTimeout(timer);
      timer = setTimeout(unlock, 200);
    };

    const first = document.getElementById(list[0]!);
    const margin = first
      ? parseFloat(getComputedStyle(first).scrollMarginTop) || 0
      : 140;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) crossing.add(entry.target.id);
          else crossing.delete(entry.target.id);
        }
        if (locked) return;
        const firstCrossing = list.find((id) => crossing.has(id));
        if (firstCrossing) setActive(firstCrossing);
      },
      { rootMargin: `-${Math.max(0, margin - 4)}px 0px -40% 0px` },
    );
    for (const id of list) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }
    window.addEventListener(JUMP_EVENT, onJump);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scrollend", unlock);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
      window.removeEventListener(JUMP_EVENT, onJump);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("scrollend", unlock);
    };
  }, [key]);
  return active;
}

/**
 * An in-page menu of sections: each entry jumps to its section and moves focus there, so
 * keyboard and screen reader users land in the right place too. A 260px sticky sidebar with
 * a right border on wide screens (a blue pill with a yellow dot marks the active entry); on
 * phones an edge to edge strip pinned right under the header (`--header-h`) that scrolls
 * sideways only, with a 2px underline on the active entry. Both scroll away with the page on
 * short screens.
 */
export function SectionNav({ sections, label, activeId }: SectionNavProps) {
  const list = useRef<HTMLUListElement>(null);
  // The strip is being swiped, or was a moment ago: leave its position alone until then
  const userUntil = useRef(0);

  function bringIntoView(smooth: boolean) {
    const strip = list.current;
    const item = strip?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!strip || !item || strip.scrollWidth <= strip.clientWidth) return;
    const edge = 16;
    const s = strip.getBoundingClientRect();
    const i = item.getBoundingClientRect();
    let left: number | undefined;
    if (i.left < s.left + edge)
      left = strip.scrollLeft + i.left - s.left - edge;
    else if (i.right > s.right - edge)
      left = strip.scrollLeft + i.right - s.right + edge;
    if (left === undefined) return;
    strip.scrollTo?.({
      left: Math.max(0, left),
      behavior: smooth ? scrollBehavior() : "auto",
    });
  }

  // Keep the active entry in view when the strip scrolls sideways (phones)
  useEffect(() => {
    if (Date.now() < userUntil.current) return;
    bringIntoView(true);
  }, [activeId]);

  const holdOff = () => {
    userUntil.current = Date.now() + 800;
  };

  function onClick(event: MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault();
    userUntil.current = 0;
    jumpTo(id);
  }
  return (
    <nav
      aria-label={label}
      className="sticky top-[var(--header-h,64px)] z-10 ml-[calc(50%-50vw)] w-screen border-b border-line bg-white short:static md:top-[72px] md:z-auto md:ml-0 md:w-[260px] md:shrink-0 md:border-b-0 md:bg-transparent md:px-0 md:pt-8 md:pb-6 md:short:static"
    >
      <ul
        ref={list}
        data-scrolls="x"
        onPointerDown={holdOff}
        onTouchMove={holdOff}
        onWheel={holdOff}
        className="flex overflow-x-auto overflow-y-hidden overscroll-x-contain px-2 scroll-px-4 md:flex-col md:overflow-visible md:px-0"
      >
        {sections.map((section) => {
          const active = section.id === activeId;
          return (
            <li key={section.id} className="shrink-0">
              <a
                href={`#${section.id}`}
                className={cn(
                  hitArea,
                  "flex min-h-11 items-center gap-2.5 rounded-card border-b-2 px-4 text-[0.92em] leading-[1.4] whitespace-nowrap transition-colors max-md:rounded-none md:mx-3 md:my-0.5 md:min-h-0 md:border-b-0 md:py-3 md:whitespace-normal",
                  active
                    ? "border-blue bg-blue font-semibold text-white max-md:bg-transparent max-md:text-blue"
                    : "border-transparent font-medium text-ink hover:bg-blue-tint-95 max-md:font-semibold",
                )}
                aria-current={active ? "location" : undefined}
                onClick={(event) => onClick(event, section.id)}
              >
                <span
                  aria-hidden="true"
                  data-slot={active ? "active-dot" : "dot"}
                  className={cn(
                    "size-1.5 shrink-0 rounded-full max-md:hidden",
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
