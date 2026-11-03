import type { QueryClient } from "@tanstack/react-query";
import { createRouter, type RouterHistory } from "@tanstack/react-router";

import type { SessionStore } from "../session/stub";
import { routeTree } from "./routes";

export interface RelayRouterOptions {
  queryClient: QueryClient;
  session: SessionStore;
  /** Defaults to the browser history; tests pass a memory history. */
  history?: RouterHistory;
}

export function createRelayRouter({
  queryClient,
  session,
  history,
}: RelayRouterOptions) {
  return createRouter({
    routeTree,
    history,
    context: { queryClient, session },
  });
}

export type RelayRouter = ReturnType<typeof createRelayRouter>;

declare module "@tanstack/react-router" {
  interface Register {
    router: RelayRouter;
  }
}
