import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BareLayout } from "./BareLayout";
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
});
