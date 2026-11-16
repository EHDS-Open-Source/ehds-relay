import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppHeader } from "./AppHeader";

let callback: ResizeObserverCallback = () => {};
const observe = vi.fn();
const disconnect = vi.fn();

beforeEach(() => {
  observe.mockClear();
  disconnect.mockClear();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(cb: ResizeObserverCallback) {
        callback = cb;
      }
      observe = observe;
      disconnect = disconnect;
      unobserve = vi.fn();
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function setHeight(height: number) {
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(
    height,
  );
}

describe("AppHeader", () => {
  it("writes its height to --header-h and follows resizes", () => {
    setHeight(64);
    const { container } = render(<AppHeader logo="Logo" />);
    const root = document.documentElement;
    expect(root.style.getPropertyValue("--header-h")).toBe("64px");
    expect(observe).toHaveBeenCalledWith(container.querySelector("header"));
    setHeight(108);
    callback([], {} as ResizeObserver);
    expect(root.style.getPropertyValue("--header-h")).toBe("108px");
  });

  it("removes --header-h and stops observing on unmount", () => {
    setHeight(64);
    const { unmount } = render(<AppHeader logo="Logo" />);
    unmount();
    expect(disconnect).toHaveBeenCalled();
    expect(document.documentElement.style.getPropertyValue("--header-h")).toBe(
      "",
    );
  });

  it("is pinned except on short screens", () => {
    const { container } = render(<AppHeader logo="Logo" />);
    expect(container.querySelector("header")).toHaveClass(
      "sticky",
      "short:static",
    );
  });

  it("gives the menu button a 44px hit area on phones", () => {
    render(<AppHeader logo="Logo" onMenuClick={() => {}} />);
    const button = screen.getByRole("button");
    expect(button.className).toContain("max-md:before:min-h-11");
    expect(button.className).toContain("max-md:before:min-w-11");
  });
});
