import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { ToastProvider } from "@ehds-relay/ui";
import { render } from "@testing-library/react";

import { createRelayRouter } from "../router/router";
import { createTestSessionStore } from "../session/testing";
import type { Session } from "../session/types";
import type { Invitation, InvitationPreview, Member } from "./queries";

export function makeMember(overrides: Partial<Member> = {}): Member {
  return {
    user_id: "u-1",
    name: "Ada Owner",
    email: "ada@example.org",
    role: "owner",
    joined_at: "2026-01-05T10:00:00Z",
    ...overrides,
  };
}

export function makeInvitation(
  overrides: Partial<Invitation> = {},
): Invitation {
  return {
    id: "inv-1",
    org_id: "demo",
    email: "new@example.org",
    name: "Nina New",
    message: null,
    role: "standard",
    status: "pending",
    invited_by: "Ada Owner",
    created_at: "2026-02-01T10:00:00Z",
    last_sent_at: "2026-02-03T10:00:00Z",
    expires_at: "2026-03-05T10:00:00Z",
    ...overrides,
  };
}

export function makePreview(
  overrides: Partial<InvitationPreview> = {},
): InvitationPreview {
  return {
    email: "invitee@example.org",
    organisation_name: "Acme Hospital",
    invited_by_name: "Ada Owner",
    role: "standard",
    status: "pending",
    expires_at: "2026-03-05T10:00:00Z",
    ...overrides,
  };
}

/** Like the dataset tests' `renderApp`, but a signed-out visitor (null) is allowed. */
export function renderAs(path: string, session: Session | null) {
  const router = createRelayRouter({
    queryClient: new QueryClient({
      defaultOptions: { queries: { retry: false } },
    }),
    session: createTestSessionStore(session),
    history: createMemoryHistory({ initialEntries: [path] }),
    navigateExternal: () => {},
  });
  render(
    <QueryClientProvider client={router.options.context.queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return router;
}
