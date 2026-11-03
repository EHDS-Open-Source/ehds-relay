// Session helpers for tests only: a store that never calls the API.
import { createSessionStore } from "./store";
import type { Session, SessionOrg, SessionStore } from "./types";

export function makeOrg(overrides: Partial<SessionOrg> = {}): SessionOrg {
  return {
    id: "demo",
    name: "Demo org",
    country: "FR",
    role: "owner",
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export const demoSession: Session = {
  user: {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Demo User",
    email: "demo@example.org",
  },
  orgs: [makeOrg()],
};

/**
 * A store that starts with `initial` (null for signed out). `signOut` resolves to
 * `logoutUrl`; `logout` can stand in for a failing API call.
 */
export function createTestSessionStore(
  initial: Session | null = demoSession,
  options: {
    logoutUrl?: string | null;
    logout?: () => Promise<string | null>;
  } = {},
): SessionStore {
  return createSessionStore(
    {
      load: () => Promise.resolve(initial),
      logout:
        options.logout ?? (() => Promise.resolve(options.logoutUrl ?? null)),
    },
    { session: initial },
  );
}
