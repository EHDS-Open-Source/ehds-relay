import { createContext, useContext, useEffect, useRef } from "react";

/** Asks the user whether to leave; resolves to true when leaving is fine. */
export type ConfirmLeave = () => Promise<boolean>;

export interface LeaveGuard {
  register: (confirm: ConfirmLeave) => () => void;
  confirmLeave: ConfirmLeave;
}

export const LeaveGuardContext = createContext<LeaveGuard>({
  register: () => () => {},
  confirmLeave: () => Promise.resolve(true),
});

/** Registers the question to ask before leaving while the calling component is mounted. */
export function useRegisterLeaveGuard(confirm: ConfirmLeave): void {
  const { register } = useContext(LeaveGuardContext);
  const latest = useRef(confirm);
  useEffect(() => {
    latest.current = confirm;
  });
  useEffect(() => register(() => latest.current()), [register]);
}

/** Resolves to true when nothing holds the user back (or they chose to leave). */
export function useConfirmLeave(): ConfirmLeave {
  return useContext(LeaveGuardContext).confirmLeave;
}
