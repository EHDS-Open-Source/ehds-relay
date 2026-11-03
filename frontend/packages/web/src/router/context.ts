import type { QueryClient } from "@tanstack/react-query";

import type { SessionStore } from "../session/types";

/** Available to every route's `beforeLoad` and `loader` as `context`. */
export interface RouterContext {
  queryClient: QueryClient;
  session: SessionStore;
  /** Leaves the app for another address (full page load). Tests replace it. */
  navigateExternal: (url: string) => void;
}
