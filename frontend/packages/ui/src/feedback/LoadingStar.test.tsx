import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LoadingStar } from "./LoadingStar";

describe("LoadingStar", () => {
  it("announces the page variant as a status with its message", () => {
    render(<LoadingStar size="page" message="Loading datasets…" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading datasets…");
  });

  it("hides the button variant from screen readers", () => {
    const { container } = render(<LoadingStar />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});
