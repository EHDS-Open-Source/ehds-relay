import type { Schemas } from "@ehds-relay/api-client";
import { ToastProvider } from "@ehds-relay/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import { noRevalidationData } from "../datasets/fakeServer";
import { createRelayRouter } from "../router/router";
import {
  createTestSessionStore,
  demoSession,
  makeOrg,
} from "../session/testing";
import type { Session } from "../session/types";

export type Dataset = Schemas["DatasetDTO"];

export const ORG = "demo";
export const ID = "ds-1";
export const base = `/api/v1/organisations/${ORG}/datasets/${ID}`;

const term = (label: string) => ({
  label,
  uri: `https://example.org/${label}`,
});

export function makeDataset(overrides: Partial<Dataset> = {}): Dataset {
  return {
    ...noRevalidationData,
    published_at: "2026-01-20T09:00:00Z",
    last_validated_at: "2026-01-20T09:00:00Z",
    id: ID,
    org_id: ORG,
    status: "published",
    title: "Hospital Admissions",
    description: "All admissions",
    metadata: {
      title: [{ lang: "en", text: "Hospital Admissions" }],
      description: [{ lang: "en", text: "All admissions" }],
      keyword: ["health", "admissions"],
      structured_data: true,
      access_rights: "restricted",
      number_of_records: 1200,
      health_theme: [term("Cardiology")],
      publisher: {
        name: "Acme Hospital",
        contact_point: { name: "Ann", email: "ann@example.org" },
      },
      quantum_label: "@prefix ex: <https://example.org/> .",
    },
    missing_for_publish: [],
    schema_version: "1",
    version: 3,
    created_at: "2026-01-01T10:00:00Z",
    updated_at: "2026-02-03T10:00:00Z",
    ...overrides,
  };
}

export type Handler = (request: Request) => Response | Promise<Response>;

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Stubs fetch: `routes` maps "METHOD /path" (query ignored) to a handler. Returns the calls. */
export function stubApi(routes: Record<string, Handler>) {
  const calls: Request[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: Request | string) => {
      const request = typeof input === "string" ? new Request(input) : input;
      calls.push(request);
      const path = new URL(request.url).pathname;
      const handler = routes[`${request.method} ${path}`];
      if (handler) return handler(request);
      if (path === "/healthz") return json({ status: "ok" });
      return json({ detail: "unexpected" }, 500);
    }),
  );
  return calls;
}

export function renderApp(path: string, session: Session = demoSession) {
  const router = createRelayRouter({
    queryClient: new QueryClient({
      defaultOptions: { queries: { retry: false } },
    }),
    session: createTestSessionStore(session),
    history: createMemoryHistory({ initialEntries: [path] }),
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

export const standardSession: Session = {
  ...demoSession,
  orgs: [makeOrg({ id: ORG, role: "standard" })],
};

/** The alert with something in it; the toast area keeps an empty alert region mounted. */
export async function findAlert(): Promise<HTMLElement> {
  return await waitFor(() => {
    const alert = screen
      .getAllByRole("alert")
      .find((el) => (el.textContent ?? "").trim() !== "");
    if (!alert) throw new Error("no alert with text");
    return alert;
  });
}
