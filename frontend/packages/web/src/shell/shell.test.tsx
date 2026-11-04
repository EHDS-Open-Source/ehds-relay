import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BareLayout, BelowCard } from "./BareLayout";
import { Logo } from "./Logo";

describe("Logo", () => {
  it("is an image named for the product", () => {
    render(<Logo />);
    expect(screen.getByRole("img", { name: "EHDS Relay" })).toBeVisible();
  });
});

describe("BareLayout", () => {
  it("draws the star ring from the supplied artwork, hidden from screen readers", () => {
    const { container } = render(<BareLayout>content</BareLayout>);
    const ring = container.querySelector("[data-slot=star-ring]");
    expect(ring).toHaveAttribute("src", "/stars.svg");
    expect(ring).toHaveAttribute("aria-hidden", "true");
    expect(ring).toHaveClass("star-ring");
  });

  it("puts the card at 520px, or 620px when wide, with the line below it outside the card", () => {
    const { container, rerender } = render(
      <BareLayout title="Sign in" below={<BelowCard>Below</BelowCard>}>
        content
      </BareLayout>,
    );
    const card = container.querySelector("[data-slot=brand-card]");
    expect(card).toHaveClass("max-w-[520px]");
    expect(card).not.toContainElement(screen.getByText("Below"));
    rerender(
      <BareLayout title="Pick" width="wide">
        content
      </BareLayout>,
    );
    expect(container.querySelector("[data-slot=brand-card]")).toHaveClass(
      "max-w-[620px]",
    );
  });
});
