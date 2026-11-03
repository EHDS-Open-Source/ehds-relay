import type { QueryClient } from "@tanstack/react-query";
import { createRouter, type RouterHistory } from "@tanstack/react-router";

import { Loading } from "../pages/Loading";
import { ServiceError } from "../pages/ServiceError";
import type { SessionStore } from "../session/types";
import { routeTree } from "./routes";

export interface RelayRouterOptions {
  queryClient: QueryClient;
  session: SessionStore;
  /** Defaults to a full page load of the address. */
  navigateExternal?: (url: string) => void;
  /** Defaults to the browser history; tests pass a memory history. */
  history?: RouterHistory;
}

export function createRelayRouter({
  queryClient,
  session,
  navigateExternal = (url) => {
    window.location.assign(url);
  },
  history,
}: RelayRouterOptions) {
  return createRouter({
    routeTree,
    history,
    context: { queryClient, session, navigateExternal },
    defaultPendingComponent: Loading,
    defaultErrorComponent: ServiceError,
  });
}

export type RelayRouter = ReturnType<typeof createRelayRouter>;

declare module "@tanstack/react-router" {
  interface Register {
    router: RelayRouter;
  }
}
