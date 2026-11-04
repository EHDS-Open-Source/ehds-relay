import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SectionNav, useActiveSection } from "./SectionNav";

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
    // Sticks under the 64px header on phones
    expect(screen.getByRole("navigation")).toHaveClass("top-16");
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
});
