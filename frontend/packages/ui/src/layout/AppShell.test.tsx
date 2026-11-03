import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppShell } from "./AppShell";

describe("AppShell", () => {
  it("renders the header, sidebar and main slots", () => {
    render(
      <AppShell header={<header>Top bar</header>} sidebar={<nav>Sections</nav>}>
        <p>Page body</p>
      </AppShell>,
    );
    expect(screen.getByRole("banner")).toHaveTextContent("Top bar");
    expect(screen.getByRole("complementary")).toHaveTextContent("Sections");
    expect(screen.getByRole("main")).toHaveTextContent("Page body");
  });

  it("omits the sidebar when none is given", () => {
    render(
      <AppShell header={<header>Top bar</header>}>
        <p>Page body</p>
      </AppShell>,
    );
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("has a skip link that targets the main content", () => {
    render(<AppShell header={<header>Top bar</header>}>Body</AppShell>);
    const skip = screen.getByRole("link", { name: "Skip to main content" });
    expect(skip).toHaveAttribute("href", "#content");
    expect(screen.getByRole("main")).toHaveAttribute("id", "content");
  });
});
