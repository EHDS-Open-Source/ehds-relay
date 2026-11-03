import { useRouter } from "@tanstack/react-router";
import { useSyncExternalStore } from "react";

import type { Session, SessionStore } from "./stub";

/** The session store the router was created with. */
export function useSessionStore(): SessionStore {
  return useRouter().options.context.session;
}

/** The current session (null when signed out); re-renders when it changes. */
export function useSession(): Session | null {
  const store = useSessionStore();
  return useSyncExternalStore(store.subscribe, store.get);
}
