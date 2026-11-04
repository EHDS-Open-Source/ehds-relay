import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BrandCard } from "./BrandCard";

describe("BrandCard", () => {
  it("shows the logo, title, description and content on a blue surface", () => {
    render(
      <BrandCard logo={<span>Logo</span>} title="Sign in" description="Welcome">
        <button>Go</button>
      </BrandCard>,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Sign in",
    );
    expect(screen.getByText("Welcome")).toBeVisible();
    expect(screen.getByText("Logo")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Go" }).closest("section"),
    ).toHaveAttribute("data-surface", "blue");
  });
});
