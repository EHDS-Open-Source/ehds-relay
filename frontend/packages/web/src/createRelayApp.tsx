import { ToastProvider } from "@ehds-relay/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";

import { api, setUnauthorizedHandler } from "./api";
import { createRelayRouter } from "./router/router";
import { createApiSessionStore } from "./session/apiStore";

export interface RelayAppOptions {
  /** Extension points for other editions. Accepted now, not used yet. */
  plugins?: readonly unknown[];
}

/** Builds the app component: query client, session and router wired together. */
export function createRelayApp(options: RelayAppOptions = {}) {
  void options.plugins;
  const queryClient = new QueryClient();
  const session = createApiSessionStore(api);
  const router = createRelayRouter({ queryClient, session });

  // A 401 while signed in means the session ended (e.g. it timed out): go and sign in again,
  // then come back to this page. Before the session is loaded the route guards deal with it.
  setUnauthorizedHandler(() => {
    if (!session.get()) return;
    session.clear();
    queryClient.clear();
    void router.navigate({
      to: "/sign-in",
      search: { redirect: router.state.location.href },
    });
  });

  return function RelayApp() {
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </QueryClientProvider>
    );
  };
}
