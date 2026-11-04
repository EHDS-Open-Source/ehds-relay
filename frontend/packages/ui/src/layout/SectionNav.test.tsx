import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { SectionNav } from "./SectionNav";

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
});
