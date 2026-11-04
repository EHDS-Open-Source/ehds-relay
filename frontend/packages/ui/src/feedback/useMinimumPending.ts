import { useEffect, useRef, useState } from "react";

/** How long a page loader stays up once shown, so it does not flash for a moment. */
export const MINIMUM_PENDING_MS = 500;

/**
 * True while `pending` is, and then on until the loader has been shown for at least
 * `minimumMs`. When the data is there from the start (`pending` false), it is false at once.
 */
export function useMinimumPending(
  pending: boolean,
  minimumMs: number = MINIMUM_PENDING_MS,
): boolean {
  const [holding, setHolding] = useState(pending);
  const shownAt = useRef<number | null>(null);

  // Start holding as soon as a loader shows, even if it was not pending at first.
  if (pending && !holding) setHolding(true);

  useEffect(() => {
    if (!holding) return;
    if (pending) {
      shownAt.current ??= Date.now();
      return;
    }
    const since = shownAt.current ?? Date.now();
    const timer = setTimeout(
      () => {
        shownAt.current = null;
        setHolding(false);
      },
      Math.max(0, minimumMs - (Date.now() - since)),
    );
    return () => clearTimeout(timer);
  }, [pending, holding, minimumMs]);

  return pending || holding;
}
