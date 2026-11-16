import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useOnlineStatus } from "./useOnlineStatus";

function setOnLine(value: boolean) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(value);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useOnlineStatus", () => {
  it("starts with what the browser reports", () => {
    setOnLine(false);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);
  });

  it("follows the offline and online events", () => {
    setOnLine(true);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
    act(() => {
      setOnLine(false);
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current).toBe(false);
    act(() => {
      setOnLine(true);
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current).toBe(true);
  });

  it("removes its listeners on unmount", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useOnlineStatus());
    unmount();
    const removed = remove.mock.calls.map(([type]) => type);
    expect(removed).toEqual(expect.arrayContaining(["online", "offline"]));
  });
});
