import type { Session, SessionStore } from "./types";

export interface SessionSource {
  /** Fetches the session. Null means signed out; anything else that goes wrong should throw. */
  load: () => Promise<Session | null>;
  /** Ends the session on the server. Resolves to where to send the browser next, if anywhere. */
  logout: () => Promise<string | null>;
}

/** A session store that keeps what `source` returned and tells subscribers when it changes. */
export function createSessionStore(
  source: SessionSource,
  initial?: { session: Session | null },
): SessionStore {
  let current = initial?.session ?? null;
  let loaded = initial !== undefined;
  let inflight: Promise<Session | null> | null = null;
  const listeners = new Set<() => void>();

  const set = (next: Session | null) => {
    current = next;
    loaded = true;
    listeners.forEach((listener) => {
      listener();
    });
  };

  const fetchFresh = () => {
    inflight ??= source
      .load()
      .then((session) => {
        set(session);
        return session;
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  };

  return {
    get: () => current,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    load: () => (loaded ? Promise.resolve(current) : fetchFresh()),
    refresh: fetchFresh,
    clear: () => {
      set(null);
    },
    signOut: async () => {
      let url: string | null = null;
      try {
        url = await source.logout();
      } catch {
        // Whatever went wrong, this browser should not keep acting as signed in.
      }
      set(null);
      return url;
    },
  };
}
