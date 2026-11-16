import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SectionNav, jumpTo, useActiveSection } from "./SectionNav";

describe("SectionNav", () => {
  it("moves focus to the section when an entry is clicked", async () => {
    render(
      <>
        <SectionNav
          label="Sections"
          sections={[
            { id: "main", label: "Main" },
            { id: "access", label: "Access" },
          ]}
        />
        <section id="main" tabIndex={-1}>
          Main
        </section>
        <section id="access" tabIndex={-1}>
          Access
        </section>
      </>,
    );
    const nav = screen.getByRole("navigation", { name: "Sections" });
    expect(nav).toBeVisible();
    await userEvent.click(screen.getByRole("link", { name: "Access" }));
    expect(document.getElementById("access")).toHaveFocus();
  });

  it("marks the active section with aria-current", () => {
    render(
      <SectionNav
        label="Sections"
        activeId="access"
        sections={[
          { id: "main", label: "Main" },
          { id: "access", label: "Access" },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "Access" })).toHaveAttribute(
      "aria-current",
      "location",
    );
    expect(screen.getByRole("link", { name: "Main" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("draws the active entry as a blue pill with a yellow dot", () => {
    render(
      <SectionNav
        label="Sections"
        activeId="main"
        sections={[
          { id: "main", label: "Main" },
          { id: "access", label: "Access" },
        ]}
      />,
    );
    const active = screen.getByRole("link", { name: "Main" });
    expect(active).toHaveClass("bg-blue", "text-white", "rounded-card");
    expect(active.querySelector('[data-slot="active-dot"]')).toHaveClass(
      "bg-yellow",
    );
    // Sticks right under the real header on phones, and moves sideways only
    expect(screen.getByRole("navigation")).toHaveClass(
      "top-[var(--header-h,64px)]",
    );
    expect(screen.getByRole("list")).toHaveClass("overflow-y-hidden");
  });
});

describe("useActiveSection", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("follows the section crossing the band under the header", () => {
    let report: (
      entries: { target: Element; isIntersecting: boolean }[],
    ) => void = () => undefined;
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: typeof report) {
          report = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    document.body.innerHTML =
      '<section id="a"></section><section id="b"></section>';
    const { result } = renderHook(() => useActiveSection(["a", "b"]));
    expect(result.current).toBe("a");
    act(() => {
      report([
        { target: document.getElementById("a")!, isIntersecting: false },
        { target: document.getElementById("b")!, isIntersecting: true },
      ]);
    });
    expect(result.current).toBe("b");
  });

  it("keeps the tapped section active until scrolling ends", () => {
    vi.useFakeTimers();
    let report: (
      entries: { target: Element; isIntersecting: boolean }[],
    ) => void = () => undefined;
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: typeof report) {
          report = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    document.body.innerHTML =
      '<section id="a" tabindex="-1"></section><section id="b" tabindex="-1"></section><section id="c" tabindex="-1"></section>';
    const { result } = renderHook(() => useActiveSection(["a", "b", "c"]));
    const at = (id: string, isIntersecting = true) => ({
      target: document.getElementById(id)!,
      isIntersecting,
    });
    act(() => jumpTo("c"));
    expect(result.current).toBe("c");
    // Sections passed on the way report in, and are ignored
    act(() => report([at("b")]));
    expect(result.current).toBe("c");
    act(() => {
      window.dispatchEvent(new Event("scrollend"));
    });
    act(() => report([at("b", false), at("c")]));
    expect(result.current).toBe("c");
    act(() => report([at("a")]));
    expect(result.current).toBe("a");
    vi.useRealTimers();
  });
});
