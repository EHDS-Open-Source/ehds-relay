import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CodeBlock } from "./CodeBlock";
import { ConfirmDialog } from "./ConfirmDialog";
import { DetailField } from "./DetailField";
import { DetailSection } from "./DetailSection";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("shows the default words and accepts others", () => {
    const { rerender } = render(<StatusBadge status="draft" />);
    expect(screen.getByText("Draft")).toBeVisible();
    rerender(<StatusBadge status="published" />);
    expect(screen.getByText("Published")).toBeVisible();
    rerender(
      <StatusBadge
        status="draft"
        labels={{ draft: "Entwurf", published: "x" }}
      />,
    );
    expect(screen.getByText("Entwurf")).toBeVisible();
  });
});

describe("DetailSection", () => {
  it("names the group and lists its fields", () => {
    render(
      <DetailSection id="s" title="Main">
        <DetailField id="f" label="Title">
          Hello
        </DetailField>
      </DetailSection>,
    );
    expect(screen.getByRole("region", { name: "Main" })).toBeVisible();
    expect(screen.getByText("Title").tagName).toBe("DT");
    expect(screen.getByText("Hello").tagName).toBe("DD");
  });
});

describe("CodeBlock", () => {
  it("copies the text", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    render(<CodeBlock text="a b" label="Turtle" />);
    expect(screen.getByLabelText("Turtle")).toHaveTextContent("a b");
    await userEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith("a b");
    expect(await screen.findByText("Copied")).toBeVisible();
  });

  it("says when copying fails", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.reject(new Error("no")) },
      configurable: true,
    });
    render(<CodeBlock text="x" label="Turtle" />);
    await userEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => {
      expect(screen.getByText("Could not copy")).toBeVisible();
    });
  });
});

describe("ConfirmDialog", () => {
  it("confirms and cancels", async () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <ConfirmDialog
        open
        onOpenChange={onOpenChange}
        title="Delete?"
        description="Gone for good"
        confirmLabel="Delete"
        error="It failed"
        onConfirm={onConfirm}
      />,
    );
    expect(screen.getByRole("alertdialog", { name: "Delete?" })).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("It failed");
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("disables the buttons while pending", () => {
    render(
      <ConfirmDialog
        open
        pending
        onOpenChange={() => {}}
        title="t"
        description="d"
        onConfirm={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });
});
