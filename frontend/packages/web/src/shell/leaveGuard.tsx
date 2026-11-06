import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

/** Asks the user whether to leave; resolves to true when leaving is fine. */
type ConfirmLeave = () => Promise<boolean>;

interface LeaveGuard {
  register: (confirm: ConfirmLeave) => () => void;
  confirmLeave: ConfirmLeave;
}

const LeaveGuardContext = createContext<LeaveGuard>({
  register: () => () => {},
  confirmLeave: () => Promise.resolve(true),
});

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

/** Registers the question to ask before leaving while the calling component is mounted. */
export function useRegisterLeaveGuard(confirm: ConfirmLeave): void {
  const { register } = useContext(LeaveGuardContext);
  const latest = useRef(confirm);
  latest.current = confirm;
  useEffect(() => register(() => latest.current()), [register]);
}

/** Resolves to true when nothing holds the user back (or they chose to leave). */
export function useConfirmLeave(): ConfirmLeave {
  return useContext(LeaveGuardContext).confirmLeave;
}
