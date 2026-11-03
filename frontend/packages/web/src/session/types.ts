import type { Schemas } from "@ehds-relay/api-client";

export type OrgRole = Schemas["MemberRole"];
export type SessionUser = Schemas["MeDTO"];
export type SessionOrg = Schemas["OrganisationDTO"];

export interface Session {
  user: SessionUser;
  orgs: readonly SessionOrg[];
}

/**
 * Where the router and the shell read the signed-in user from. Signing in is a full-page
 * navigation to the API, so there is no sign-in method here.
 */
export interface SessionStore {
  /** The session as last loaded, or null when signed out or not loaded yet. */
  get: () => Session | null;
  subscribe: (listener: () => void) => () => void;
  /** Loads the session once and then answers from memory. Null means signed out. */
  load: () => Promise<Session | null>;
  /** Loads it again, e.g. after an organisation was created. */
  refresh: () => Promise<Session | null>;
  /** Forgets the session without telling the API (it already said we are signed out). */
  clear: () => void;
  /**
   * Ends the session on the API and forgets it here. Resolves to the address of the identity
   * provider's sign-out page, or null when there is none or the call failed.
   */
  signOut: () => Promise<string | null>;
}
