import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useMinimumPending } from "./useMinimumPending";

describe("useMinimumPending", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("keeps a loader up for at least half a second", () => {
    const { result, rerender } = renderHook(
      ({ pending }) => useMinimumPending(pending),
      { initialProps: { pending: true } },
    );
    expect(result.current).toBe(true);
    act(() => void vi.advanceTimersByTime(100));
    rerender({ pending: false });
    expect(result.current).toBe(true);
    act(() => void vi.advanceTimersByTime(350));
    expect(result.current).toBe(true);
    act(() => void vi.advanceTimersByTime(60));
    expect(result.current).toBe(false);
  });

  it("does not hold a loader that was up long enough", () => {
    const { result, rerender } = renderHook(
      ({ pending }) => useMinimumPending(pending),
      { initialProps: { pending: true } },
    );
    act(() => void vi.advanceTimersByTime(800));
    rerender({ pending: false });
    act(() => void vi.advanceTimersByTime(0));
    expect(result.current).toBe(false);
  });

  it("shows nothing when the data is already there", () => {
    const { result } = renderHook(() => useMinimumPending(false));
    expect(result.current).toBe(false);
  });
});
