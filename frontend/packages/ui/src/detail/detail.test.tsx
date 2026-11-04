import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CodeBlock } from "./CodeBlock";
import { ConfirmDialog } from "./ConfirmDialog";
import { DetailField } from "./DetailField";
import { DetailSection } from "./DetailSection";
import { Ribbon } from "../layout/Ribbon";
import { DetailPill } from "./DetailPill";
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

describe("ConfirmDialog focus and content", () => {
  it("focuses Cancel first and takes rich content and an icon", () => {
    render(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="Remove?"
        icon="remove"
        description={
          <p>
            Remove <strong>Marco</strong>?
          </p>
        }
        destructive
        confirmLabel="Remove user"
        onConfirm={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    expect(screen.getByText("Marco").tagName).toBe("STRONG");
    expect(
      screen.getByRole("alertdialog").querySelector("[data-icon=remove]"),
    ).not.toBeNull();
  });
});

describe("DetailField empty value", () => {
  it("shows a dash that is read out as not provided", () => {
    render(
      <DetailSection title="Main">
        <DetailField label="Notes">{null}</DetailField>
      </DetailSection>,
    );
    expect(screen.getByText("—")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("Not provided")).toBeInTheDocument();
  });
});

describe("StatusBadge look", () => {
  it("tells Published and Draft apart by more than the word", () => {
    const { rerender } = render(<StatusBadge status="published" />);
    const published = screen.getByText("Published");
    expect(published).toHaveAttribute("data-variant", "success");
    expect(published.querySelector("[data-icon=tick]")).not.toBeNull();
    rerender(<StatusBadge status="draft" />);
    const draft = screen.getByText("Draft");
    expect(draft).toHaveAttribute("data-variant", "secondary");
    expect(draft.querySelector("[data-icon=edit]")).not.toBeNull();
  });
});

describe("DetailPill", () => {
  it("shows its text with an optional icon", () => {
    render(<DetailPill icon="lock">Restricted</DetailPill>);
    expect(screen.getByText("Restricted")).toBeVisible();
    expect(
      screen.getByText("Restricted").querySelector("[data-icon=lock]"),
    ).not.toBeNull();
  });
});

describe("Ribbon", () => {
  it("announces the normal strip as a status", () => {
    render(
      <Ribbon>
        Due <strong>1 May 2027</strong>
      </Ribbon>,
    );
    const ribbon = screen.getByRole("status");
    expect(ribbon).toHaveAttribute("data-tone", "due");
    expect(ribbon).toHaveTextContent("Due 1 May 2027");
    expect(ribbon.querySelector("[data-icon=calendar-tick]")).not.toBeNull();
  });

  it("goes yellow when overdue and carries a second line and an action", () => {
    render(
      <Ribbon tone="overdue" detail="Do it" action={<button>Next</button>}>
        Overdue since 1 May 2025
      </Ribbon>,
    );
    const ribbon = screen.getByRole("status");
    expect(ribbon).toHaveAttribute("data-tone", "overdue");
    expect(ribbon.className).toContain("bg-yellow");
    expect(ribbon.querySelector("[data-icon=calendar-alert]")).not.toBeNull();
    expect(screen.getByText("Do it")).toBeVisible();
    expect(screen.getByRole("button", { name: "Next" })).toBeVisible();
  });
});
