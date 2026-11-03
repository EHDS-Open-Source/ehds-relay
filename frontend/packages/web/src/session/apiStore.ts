import type { ApiClient } from "@ehds-relay/api-client";

import { createSessionStore } from "./store";
import type { SessionStore } from "./types";

/** The real session: who is signed in (`/me`) and which organisations they belong to. */
export function createApiSessionStore(api: ApiClient): SessionStore {
  return createSessionStore({
    load: async () => {
      const [me, orgs] = await Promise.all([
        api.GET("/api/v1/me"),
        api.GET("/api/v1/organisations"),
      ]);
      // Not signed in is an answer, not a failure.
      if (me.response.status === 401) return null;
      if (!me.data)
        throw new Error(`Loading the user failed (${me.response.status})`);
      if (!orgs.data) {
        throw new Error(
          `Loading organisations failed (${orgs.response.status})`,
        );
      }
      return { user: me.data, orgs: orgs.data };
    },
    logout: async () => {
      const { data } = await api.POST("/api/v1/auth/logout");
      return data?.redirect_url ?? null;
    },
  });
}
