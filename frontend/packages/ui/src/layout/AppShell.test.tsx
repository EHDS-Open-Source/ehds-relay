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

  it("renders the ribbon between the header and the content", () => {
    render(
      <AppShell header={<header>Top bar</header>} ribbon={<div>Ribbon</div>}>
        Body
      </AppShell>,
    );
    expect(screen.getByText("Ribbon")).toBeVisible();
  });

  it("puts the banner after the ribbon and before the content", () => {
    render(
      <AppShell
        header={<header>Top bar</header>}
        ribbon={<div>Ribbon</div>}
        banner={<div>Offline</div>}
      >
        Body
      </AppShell>,
    );
    const ribbon = screen.getByText("Ribbon");
    const banner = screen.getByText("Offline");
    const main = screen.getByRole("main");
    expect(
      ribbon.compareDocumentPosition(banner) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      banner.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("adds no banner wrapper when there is no banner", () => {
    const { container } = render(
      <AppShell header={<header>Top bar</header>} banner={null}>
        Body
      </AppShell>,
    );
    expect(container.querySelector(".mt-4")).toBeNull();
  });
});
