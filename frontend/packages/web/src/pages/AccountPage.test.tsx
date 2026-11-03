import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "../api";
import { createRelayRouter } from "../router/router";
import { createApiSessionStore } from "../session/apiStore";
import { demoSession, makeOrg } from "../session/testing";
import { shellMessages } from "../shell/messages";

const text = shellMessages.account;

/** Answers PATCH /me like the API: the user with the name that was sent. */
async function renameOk(request: Request): Promise<Response> {
  const { name } = (await request.json()) as { name: string };
  return Response.json({ ...demoSession.user, name });
}

/**
 * An API with the demo user. `patch` answers `PATCH /me`; a success also changes what `/me`
 * returns afterwards, as the real API would.
 */
function stubApi(
  patch: (request: Request) => Response | Promise<Response> = renameOk,
  options: { orgs?: unknown[]; logoutUrl?: string | null } = {},
) {
  let me = { ...demoSession.user };
  const fetch = vi.fn(async (request: Request) => {
    const path = new URL(request.url).pathname;
    if (path === "/api/v1/me" && request.method === "PATCH") {
      const response = await patch(request.clone());
      if (response.ok) me = (await response.clone().json()) as typeof me;
      return response;
    }
    if (path === "/api/v1/me") return Response.json(me);
    if (path === "/api/v1/organisations")
      return Response.json(options.orgs ?? [makeOrg()]);
    if (path === "/api/v1/auth/logout")
      return Response.json({ redirect_url: options.logoutUrl ?? null });
    return Response.json({ status: "ok" });
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

function renderPage(navigateExternal: (url: string) => void = vi.fn()) {
  const queryClient = new QueryClient();
  const session = createApiSessionStore(api);
  const router = createRelayRouter({
    queryClient,
    session,
    navigateExternal,
    history: createMemoryHistory({ initialEntries: ["/account"] }),
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router, session };
}

const patches = (fetch: ReturnType<typeof stubApi>) =>
  fetch.mock.calls.filter(([request]) => request.method === "PATCH");

async function nameInput() {
  return screen.findByLabelText(text.nameLabel);
}

describe("AccountPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the user's name and a read-only email", async () => {
    stubApi();
    renderPage();
    expect(
      await screen.findByRole("heading", { level: 1, name: text.title }),
    ).toBeVisible();
    expect(await nameInput()).toHaveValue(demoSession.user.name);
    const email = screen.getByLabelText(text.emailLabel);
    expect(email).toHaveValue(demoSession.user.email);
    expect(email).toHaveAttribute("readonly");
  });

  it("works for someone with no organisation", async () => {
    stubApi(undefined, { orgs: [] });
    const { router } = renderPage();
    expect(await nameInput()).toHaveValue(demoSession.user.name);
    expect(router.state.location.pathname).toBe("/account");
  });

  it("saves a new name and refreshes the session", async () => {
    const fetch = stubApi();
    const { session } = renderPage();
    const input = await nameInput();
    await userEvent.clear(input);
    await userEvent.type(input, "  Dana Demo  ");
    await userEvent.click(screen.getByRole("button", { name: text.save }));

    expect(await screen.findByText(text.saved)).toBeVisible();
    const [request] = patches(fetch)[0]!;
    expect(await request.json()).toEqual({ name: "Dana Demo" });
    expect(input).toHaveValue("Dana Demo");
    await waitFor(() => {
      expect(session.get()?.user.name).toBe("Dana Demo");
    });
  });

  it("says what is wrong with an empty name and sends nothing", async () => {
    const fetch = stubApi();
    renderPage();
    const input = await nameInput();
    await userEvent.clear(input);
    await userEvent.type(input, "   ");
    await userEvent.click(screen.getByRole("button", { name: text.save }));

    expect(screen.getByText(text.nameRequired)).toBeVisible();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(patches(fetch)).toHaveLength(0);
  });

  it("says when the name is too long and sends nothing", async () => {
    const fetch = stubApi();
    renderPage();
    const input = await nameInput();
    await userEvent.clear(input);
    await userEvent.click(input);
    await userEvent.paste("x".repeat(201));
    await userEvent.click(screen.getByRole("button", { name: text.save }));

    expect(screen.getByText(text.nameTooLong)).toBeVisible();
    expect(patches(fetch)).toHaveLength(0);
  });

  it.each([
    [422, text.invalid],
    [500, text.failed],
  ])(
    "shows a readable message when the API answers %i",
    async (status, message) => {
      stubApi(() => Response.json({ detail: "raw server text" }, { status }));
      const { session } = renderPage();
      const input = await nameInput();
      await userEvent.type(input, "x");
      await userEvent.click(screen.getByRole("button", { name: text.save }));

      expect(await screen.findByRole("alert")).toHaveTextContent(message);
      expect(screen.queryByText("raw server text")).not.toBeInTheDocument();
      expect(session.get()?.user.name).toBe(demoSession.user.name);
    },
  );

  it("signs out like the menu does", async () => {
    const navigateExternal = vi.fn();
    const fetch = stubApi(undefined, { logoutUrl: "https://idp.test/out" });
    const { session } = renderPage(navigateExternal);
    await nameInput();
    await userEvent.click(
      screen.getByRole("button", { name: shellMessages.signOut }),
    );
    await waitFor(() => {
      expect(navigateExternal).toHaveBeenCalledWith("https://idp.test/out");
    });
    expect(session.get()).toBeNull();
    expect(
      fetch.mock.calls.some(
        ([request]) =>
          request.method === "POST" &&
          new URL(request.url).pathname === "/api/v1/auth/logout",
      ),
    ).toBe(true);
  });
});
