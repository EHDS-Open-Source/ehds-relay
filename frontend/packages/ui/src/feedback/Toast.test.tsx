import { useEffect } from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Banner } from "./Banner";
import { ToastProvider, useToast, type ToastOptions } from "./Toast";

const holder: { show?: (o: ToastOptions) => number } = {};
function Grab() {
  const api = useToast();
  useEffect(() => {
    holder.show = api.show;
  }, [api]);
  return null;
}
function setup() {
  render(
    <ToastProvider>
      <Grab />
    </ToastProvider>,
  );
}
const add = (o: ToastOptions) => act(() => void holder.show?.(o));

describe("Toast", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("closes success after 5 seconds", () => {
    setup();
    add({ tone: "success", message: "Saved" });
    expect(screen.getByText("Saved")).toBeVisible();
    act(() => void vi.advanceTimersByTime(4900));
    expect(screen.getByText("Saved")).toBeVisible();
    act(() => void vi.advanceTimersByTime(200));
    expect(screen.queryByText("Saved")).toBeNull();
  });

  it("pauses while hovered and keeps the time left", () => {
    setup();
    add({ tone: "info", message: "Hello" });
    const toast = screen.getByText("Hello").closest("[data-slot=toast]")!;
    act(() => void vi.advanceTimersByTime(3000));
    act(() => {
      toast.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    });
    act(() => void vi.advanceTimersByTime(10000));
    expect(screen.getByText("Hello")).toBeVisible();
    act(() => {
      toast.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
    });
    act(() => void vi.advanceTimersByTime(2100));
    expect(screen.queryByText("Hello")).toBeNull();
  });

  it("keeps warnings and errors until dismissed, in the assertive region", () => {
    setup();
    add({ tone: "error", message: "Failed" });
    add({ tone: "success", message: "Fine" });
    act(() => void vi.advanceTimersByTime(60000));
    expect(screen.getByRole("alert")).toHaveTextContent("Failed");
    expect(screen.queryByText("Fine")).toBeNull();
  });

  it("announces success politely", () => {
    setup();
    add({ tone: "success", message: "Fine" });
    expect(screen.getByRole("status")).toHaveTextContent("Fine");
  });

  it("shows at most three, dropping the oldest", () => {
    setup();
    for (const n of ["a", "b", "c", "d"]) add({ message: n });
    expect(screen.queryByText("a")).toBeNull();
    expect(screen.getByText("d")).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Dismiss" })).toHaveLength(3);
  });
});

describe("Toast interaction", () => {
  it("runs the action and dismisses", async () => {
    setup();
    const onClick = vi.fn();
    add({
      tone: "error",
      message: "Failed",
      action: { label: "Try again", onClick },
    });
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onClick).toHaveBeenCalled();
    expect(screen.queryByText("Failed")).toBeNull();
  });

  it("needs a provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Grab />)).toThrow(/ToastProvider/);
    spy.mockRestore();
  });
});

describe("Banner", () => {
  it("uses alert for warnings and status otherwise, and dismisses on request", async () => {
    const onDismiss = vi.fn();
    const { rerender } = render(<Banner tone="warning">Offline</Banner>);
    expect(screen.getByRole("alert")).toHaveTextContent("Offline");
    expect(screen.queryByRole("button")).toBeNull();
    rerender(
      <Banner tone="info" onDismiss={onDismiss}>
        FYI
      </Banner>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("FYI");
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalled();
  });
});
