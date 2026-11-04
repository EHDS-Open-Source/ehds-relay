import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Icon } from "../icons";
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
  it("shows the star after the label, marked busy, and ignores presses", async () => {
    const onClick = vi.fn();
    render(
      <Button busy onClick={onClick}>
        Saving…
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Saving…" });
    // Not disabled, so it keeps focus and is not faded.
    expect(button).toBeEnabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button.lastElementChild).toHaveAttribute(
      "data-slot",
      "loading-star",
    );
    await userEvent.click(button);
    button.focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    expect(onClick).not.toHaveBeenCalled();
  });

  it("does not submit its form while busy", async () => {
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    render(
      <form onSubmit={(event) => onSubmit(event.nativeEvent)}>
        <input aria-label="Name" />
        <Button type="submit" busy>
          Save
        </Button>
      </form>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await userEvent.type(screen.getByLabelText("Name"), "x{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("puts the star in place of the button's own icon", () => {
    const { container } = render(
      <Button busy>
        Save <Icon name="save" />
      </Button>,
    );
    const button = screen.getByRole("button");
    expect(button.className).toContain("aria-busy:[&>[data-slot=icon]]:hidden");
    expect(container.querySelectorAll("[data-slot=loading-star]")).toHaveLength(
      1,
    );
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
