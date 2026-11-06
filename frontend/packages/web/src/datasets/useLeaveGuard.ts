import { useBlocker } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { useRegisterLeaveGuard } from "../shell/leaveGuardContext";

/**
 * Holds back leaving the form while it has unsaved changes: a router navigation to another
 * page (links, menus, browser Back), the browser's own prompt when the tab is closed, and
 * Log out, which asks through the layout's leave guard. Moving within the page (anchors,
 * `?saved=`) never asks. `saveForLeave` resolves to true only when the save worked.
 */
export function useLeaveGuard({
  isChanged,
  saveForLeave,
}: {
  isChanged: () => boolean;
  saveForLeave: () => Promise<boolean>;
}) {
  // Set once the user has chosen to leave, so nothing (not even the browser) asks again
  const released = useRef(false);
  const changed = useRef(isChanged);
  useEffect(() => {
    changed.current = isChanged;
  });

  const blocker = useBlocker({
    shouldBlockFn: useCallback(
      ({
        current,
        next,
      }: {
        current: { pathname: string };
        next: { pathname: string };
      }) =>
        !released.current &&
        next.pathname !== current.pathname &&
        changed.current(),
      [],
    ),
    enableBeforeUnload: useCallback(
      () => !released.current && changed.current(),
      [],
    ),
    withResolver: true,
  });

  // Log out is not a router navigation: the layout asks through this promise instead
  const [loggingOut, setLoggingOut] = useState<((ok: boolean) => void) | null>(
    null,
  );
  useRegisterLeaveGuard(() =>
    released.current || !changed.current()
      ? Promise.resolve(true)
      : new Promise<boolean>((resolve) => {
          setLoggingOut(() => resolve);
        }),
  );

  const [pending, setPending] = useState(false);
  const open = blocker.status === "blocked" || loggingOut !== null;

  function finish(ok: boolean) {
    if (ok) released.current = true;
    if (loggingOut) {
      loggingOut(ok);
      setLoggingOut(null);
    } else if (ok) blocker.proceed?.();
    else blocker.reset?.();
  }

  return {
    open,
    pending,
    keepEditing: () => {
      finish(false);
    },
    leave: () => {
      finish(true);
    },
    saveAndLeave: async () => {
      setPending(true);
      const saved = await saveForLeave().finally(() => {
        setPending(false);
      });
      finish(saved);
    },
  };
}
