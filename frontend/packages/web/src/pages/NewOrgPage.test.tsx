import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "../api";
import { createRelayRouter } from "../router/router";
import { createApiSessionStore } from "../session/apiStore";
import { demoSession, makeOrg } from "../session/testing";
import { shellMessages } from "../shell/messages";

const text = shellMessages.newOrg;
const created = makeOrg({ id: "new-org", name: "Acme Health", country: "EL" });

/** An API where the user has no organisation until one is created. */
function stubApi(post: (request: Request) => Response) {
  let orgs: unknown[] = [];
  const fetch = vi.fn((request: Request) => {
    const path = new URL(request.url).pathname;
    if (path === "/api/v1/me")
      return Promise.resolve(Response.json(demoSession.user));
    if (path === "/api/v1/organisations" && request.method === "POST") {
      const response = post(request);
      if (response.status === 201) orgs = [created];
      return Promise.resolve(response);
    }
    if (path === "/api/v1/organisations")
      return Promise.resolve(Response.json(orgs));
    // The catalogue it opens is empty
    if (path.endsWith("/datasets")) return Promise.resolve(Response.json([]));
    return Promise.resolve(Response.json({ status: "ok" }));
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

function renderPage() {
  const queryClient = new QueryClient();
  const router = createRelayRouter({
    queryClient,
    session: createApiSessionStore(api),
    history: createMemoryHistory({ initialEntries: ["/orgs"] }),
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

const posts = (fetch: ReturnType<typeof stubApi>) =>
  fetch.mock.calls.filter(([request]) => request.method === "POST");

describe("NewOrgPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends nothing and says what is missing when fields are empty", async () => {
    const fetch = stubApi(() => Response.json(created, { status: 201 }));
    renderPage();
    await screen.findByRole("heading", { name: text.title });
    await userEvent.click(screen.getByRole("button", { name: text.submit }));
    expect(screen.getByText(text.nameRequired)).toBeVisible();
    expect(screen.getByText(text.countryRequired)).toBeVisible();
    expect(posts(fetch)).toHaveLength(0);
  });

  it("marks fields invalid, focuses the first and clears an error on typing", async () => {
    stubApi(() => Response.json(created, { status: 201 }));
    renderPage();
    const name = await screen.findByLabelText(new RegExp(text.nameLabel));
    await userEvent.click(screen.getByRole("button", { name: text.submit }));
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveFocus();
    expect(name).toHaveAccessibleDescription(text.nameRequired);
    await userEvent.type(name, "A");
    expect(screen.queryByText(text.nameRequired)).toBeNull();
    expect(screen.getByText(text.countryRequired)).toBeVisible();
  });

  it("creates the organisation and opens its catalogue", async () => {
    const fetch = stubApi(() => Response.json(created, { status: 201 }));
    const router = renderPage();
    await userEvent.type(
      await screen.findByLabelText(text.nameLabel),
      "Acme Health",
    );
    await userEvent.selectOptions(
      screen.getByLabelText(text.countryLabel),
      "Greece",
    );
    await userEvent.click(screen.getByRole("button", { name: text.submit }));

    await screen.findByRole("heading", { name: "Dataset Catalogue" });
    expect(router.state.location.pathname).toBe("/orgs/new-org/catalogue");
    await userEvent.click(
      within(screen.getByRole("banner")).getByRole("button", {
        name: "Open menu",
      }),
    );
    expect(screen.getByRole("dialog")).toHaveAccessibleDescription(
      "Acme Health",
    );
    await userEvent.keyboard("{Escape}");

    const [request] = posts(fetch)[0]!;
    expect(request.headers.get("X-Requested-By")).toBe("ehds-relay");
    expect(await request.json()).toEqual({
      name: "Acme Health",
      country: "EL",
    });
  });

  it("offers Other, saved as XX", async () => {
    const fetch = stubApi(() => Response.json(created, { status: 201 }));
    renderPage();
    await userEvent.type(await screen.findByLabelText(text.nameLabel), "Acme");
    await userEvent.selectOptions(
      screen.getByLabelText(text.countryLabel),
      "Other",
    );
    await userEvent.click(screen.getByRole("button", { name: text.submit }));
    await screen.findByRole("heading", { name: "Dataset Catalogue" });
    expect(await posts(fetch)[0]![0].json()).toEqual({
      name: "Acme",
      country: "XX",
    });
  });

  it("shows a message when the details are refused", async () => {
    stubApi(() => Response.json({ detail: [] }, { status: 422 }));
    renderPage();
    await userEvent.type(await screen.findByLabelText(text.nameLabel), "Acme");
    await userEvent.selectOptions(
      screen.getByLabelText(text.countryLabel),
      "France",
    );
    await userEvent.click(screen.getByRole("button", { name: text.submit }));
    expect(await screen.findByText(text.invalid)).toBeVisible();
  });

  it("shows a message when the service fails", async () => {
    stubApi(() => new Response(null, { status: 500 }));
    renderPage();
    await userEvent.type(await screen.findByLabelText(text.nameLabel), "Acme");
    await userEvent.selectOptions(
      screen.getByLabelText(text.countryLabel),
      "France",
    );
    await userEvent.click(screen.getByRole("button", { name: text.submit }));
    expect(await screen.findByText(text.failed)).toBeVisible();
  });
});
