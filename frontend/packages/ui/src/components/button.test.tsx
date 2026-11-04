import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./button";

describe("Button", () => {
  it("renders its children", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("Button busy", () => {
  it("shows the star, is disabled and marked busy", async () => {
    const onClick = vi.fn();
    const { container } = render(
      <Button busy onClick={onClick}>
        Saving…
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Saving…" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(container.querySelector("[data-slot=loading-star]")).not.toBeNull();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("is not busy by default", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button")).not.toHaveAttribute("aria-busy");
  });

  it("keeps the older variant names working", () => {
    render(<Button variant="outline">Cancel</Button>);
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveAttribute(
      "data-variant",
      "outline",
    );
  });
});
