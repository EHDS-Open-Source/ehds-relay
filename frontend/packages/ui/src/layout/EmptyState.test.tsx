import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("is quiet by default and a status when asked", () => {
    const { rerender } = render(<EmptyState title="No datasets yet" />);
    expect(screen.queryByRole("status")).toBeNull();
    rerender(<EmptyState title="No matches" status />);
    expect(screen.getByRole("status")).toHaveTextContent("No matches");
  });

  it("compact is a status and drops the action", () => {
    render(
      <EmptyState
        compact
        title="No other users"
        action={<button>Go</button>}
      />,
    );
    expect(screen.getByRole("status")).toBeVisible();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
