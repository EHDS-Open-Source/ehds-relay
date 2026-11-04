import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Icon } from "./Icon";
import { glyphs } from "./glyphs";

describe("Icon", () => {
  it("is hidden from screen readers by default", () => {
    const { container } = render(<Icon name="search" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).not.toHaveAttribute("role");
  });

  it("is labelled when asked", () => {
    render(<Icon name="close" label="Close menu" />);
    const icon = screen.getByRole("img", { name: "Close menu" });
    expect(icon).not.toHaveAttribute("aria-hidden");
  });

  it("takes its box from the size scale", () => {
    const { container } = render(<Icon name="star" size="lg" />);
    expect(container.querySelector("svg")).toHaveStyle({
      width: "var(--icon-lg)",
    });
  });

  it("draws every named icon", () => {
    for (const name of Object.keys(glyphs) as (keyof typeof glyphs)[]) {
      const { container, unmount } = render(<Icon name={name} />);
      expect(container.querySelector("svg")?.childElementCount).toBeGreaterThan(
        0,
      );
      unmount();
    }
  });

  it("follows the text colour with no fixed colours in the artwork", () => {
    for (const name of Object.keys(glyphs) as (keyof typeof glyphs)[]) {
      const { container, unmount } = render(<Icon name={name} />);
      expect(container.innerHTML, name).not.toMatch(/#[0-9a-f]{3,6}/i);
      expect(container.querySelector("g")).toHaveAttribute(
        "fill",
        "currentColor",
      );
      unmount();
    }
  });
});
