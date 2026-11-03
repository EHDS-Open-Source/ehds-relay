// Stand-in for the real session until sign-in lands: one fake user in one fake organisation.
// Everything that needs to know who is signed in goes through SessionStore, so swapping this
// module for the real thing does not touch the router or the shell.

export type OrgRole = "owner" | "standard";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

export interface SessionOrg {
  id: string;
  name: string;
  role: OrgRole;
}

export interface Session {
  user: SessionUser;
  orgs: readonly SessionOrg[];
}

export interface SessionStore {
  /** The current session, or null when signed out. */
  get: () => Session | null;
  subscribe: (listener: () => void) => () => void;
  signIn: () => void;
  signOut: () => void;
}

export const demoSession: Session = {
  user: { id: "demo-user", name: "Demo User", email: "demo@example.org" },
  orgs: [{ id: "demo", name: "Demo org", role: "owner" }],
};

/** Pass `null` to start signed out. `signIn()` always signs in as the demo user. */
export function createStubSessionStore(
  initial: Session | null = demoSession,
): SessionStore {
  let current = initial;
  const listeners = new Set<() => void>();

  const set = (next: Session | null) => {
    current = next;
    listeners.forEach((listener) => {
      listener();
    });
  };

  return {
    get: () => current,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    signIn: () => {
      set(demoSession);
    },
    signOut: () => {
      set(null);
    },
  };
}
