import type { QueryClient } from "@tanstack/react-query";

import type { SessionStore } from "../session/stub";

/** Available to every route's `beforeLoad` and `loader` as `context`. */
export interface RouterContext {
  queryClient: QueryClient;
  session: SessionStore;
}
