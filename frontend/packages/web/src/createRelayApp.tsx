import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";

import { createRelayRouter } from "./router/router";
import { createStubSessionStore } from "./session/stub";

export interface RelayAppOptions {
  /** Extension points for other editions. Accepted now, not used yet. */
  plugins?: readonly unknown[];
}

/** Builds the app component: query client, session and router wired together. */
export function createRelayApp(options: RelayAppOptions = {}) {
  void options.plugins;
  const queryClient = new QueryClient();
  const session = createStubSessionStore();
  const router = createRelayRouter({ queryClient, session });

  return function RelayApp() {
    return (
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    );
  };
}
