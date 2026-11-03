import { useNavigate, useRouter } from "@tanstack/react-router";
import { useSyncExternalStore } from "react";

import type { Session, SessionStore } from "./types";

/** The session store the router was created with. */
export function useSessionStore(): SessionStore {
  return useRouter().options.context.session;
}

/** The current session (null when signed out); re-renders when it changes. */
export function useSession(): Session | null {
  const store = useSessionStore();
  return useSyncExternalStore(store.subscribe, store.get);
}

/**
 * Returns a function that signs out: ends the session, then goes to the identity provider's
 * sign-out page, or to our own sign-in page when there is none.
 */
export function useSignOut(): () => Promise<void> {
  const router = useRouter();
  const navigate = useNavigate();
  return async () => {
    const { session, navigateExternal } = router.options.context;
    const url = await session.signOut();
    if (url) navigateExternal(url);
    else await navigate({ to: "/sign-in" });
  };
}
