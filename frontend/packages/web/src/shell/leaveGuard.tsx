import { useCallback, useMemo, useRef, type ReactNode } from "react";

import { LeaveGuardContext, type ConfirmLeave } from "./leaveGuardContext";

/**
 * Lets a page hold back an exit that does not go through the router, such as Log out, which
 * ends the session before any navigation happens. Wrap a layout in this; the page registers
 * its question with `useRegisterLeaveGuard` and the menu asks it with `useConfirmLeave`.
 */
export function LeaveGuardProvider({ children }: { children: ReactNode }) {
  const current = useRef<ConfirmLeave | null>(null);
  const register = useCallback((confirm: ConfirmLeave) => {
    current.current = confirm;
    return () => {
      if (current.current === confirm) current.current = null;
    };
  }, []);
  const confirmLeave = useCallback(
    () => current.current?.() ?? Promise.resolve(true),
    [],
  );
  const value = useMemo(
    () => ({ register, confirmLeave }),
    [register, confirmLeave],
  );
  return (
    <LeaveGuardContext.Provider value={value}>
      {children}
    </LeaveGuardContext.Provider>
  );
}
