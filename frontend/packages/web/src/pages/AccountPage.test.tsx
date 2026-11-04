import { ToastProvider } from "@ehds-relay/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "../api";
import { createRelayRouter } from "../router/router";
import { createApiSessionStore } from "../session/apiStore";
import { demoSession, makeOrg } from "../session/testing";
import { shellMessages } from "../shell/messages";

const text = shellMessages.account;
// The required star adds hidden text to the label, so match on the start.
const nameLabel = new RegExp(`^${text.nameLabel}`);

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
  options: {
    orgs?: unknown[];
    logoutUrl?: string | null;
    notificationsGet?: () => Response;
    notificationsPut?: (request: Request) => Response | Promise<Response>;
  } = {},
) {
  let me = { ...demoSession.user };
  let enabled = true;
  const settings = () => ({
    settings: [{ kind: "revalidation_reminder", enabled }],
  });
  const fetch = vi.fn(async (request: Request) => {
    const path = new URL(request.url).pathname;
    if (path === "/api/v1/me" && request.method === "PATCH") {
      const response = await patch(request.clone());
      if (response.ok) me = (await response.clone().json()) as typeof me;
      return response;
    }
    if (path === "/api/v1/me/notifications") {
      if (request.method === "PUT") {
        if (options.notificationsPut)
          return options.notificationsPut(request.clone());
        const body = (await request.clone().json()) as {
          settings: { enabled: boolean }[];
        };
        enabled = body.settings[0]!.enabled;
      } else if (options.notificationsGet) return options.notificationsGet();
      return Response.json(settings());
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
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return { router, session };
}

const patches = (fetch: ReturnType<typeof stubApi>) =>
  fetch.mock.calls.filter(([request]) => request.method === "PATCH");

async function nameInput() {
  return screen.findByLabelText(nameLabel);
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

    expect(
      await screen.findByRole("button", { name: text.saved }),
    ).toBeVisible();
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
    expect(input).toHaveFocus();
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

      expect(await screen.findByText(message)).toBeVisible();
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
      screen.getByRole("button", { name: shellMessages.logOut }),
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

  it("ACC-4 lists each organisation with country and role", async () => {
    stubApi(undefined, {
      orgs: [
        makeOrg({
          id: "a",
          name: "Alpha Health",
          country: "FR",
          role: "owner",
        }),
        makeOrg({
          id: "b",
          name: "Beta Care",
          country: "DE",
          role: "standard",
        }),
      ],
    });
    renderPage();
    await nameInput();
    const rows = within(
      screen.getByRole("list", { name: text.orgs.title }),
    ).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Alpha Health");
    expect(rows[0]).toHaveTextContent("France");
    expect(rows[0]).toHaveTextContent("Owner");
    expect(rows[1]).toHaveTextContent("Beta Care");
    expect(rows[1]).toHaveTextContent("Germany");
    expect(rows[1]).toHaveTextContent("Standard");
  });

  it.each([
    ["owner", text.role.ownerHint],
    ["standard", text.role.standardHint],
  ] as const)(
    "shows the %s role in the only organisation as a tag with a hint",
    async (role, hint) => {
      stubApi(undefined, { orgs: [makeOrg({ role })] });
      renderPage();
      await nameInput();
      const label = screen.getByText(text.role.label);
      const row = label.parentElement!;
      const tag = within(row).getByText(shellMessages.members.roles[role]);
      expect(tag).toHaveAttribute("data-slot", "badge");
      expect(within(row).getByText(hint)).toBeVisible();
      // A reminder only, never a control.
      expect(within(row).queryByRole("combobox")).not.toBeInTheDocument();
    },
  );

  it("leaves the role out when the user is in several organisations", async () => {
    stubApi(undefined, {
      orgs: [makeOrg({ id: "a" }), makeOrg({ id: "b", name: "Beta" })],
    });
    renderPage();
    await nameInput();
    expect(screen.queryByText(text.role.label)).not.toBeInTheDocument();
  });

  it("puts the details in a 560px card with Save changes and Log out below it", async () => {
    stubApi();
    renderPage();
    const card = (await nameInput()).closest("[class*=shadow-card]")!;
    expect(card).toHaveClass("max-w-[560px]", "rounded-card");
    const save = screen.getByRole("button", { name: text.save });
    expect(card).not.toContainElement(save);
    expect(save.lastElementChild).toHaveAttribute("data-icon", "save");
    expect(
      screen.getByRole("button", { name: shellMessages.logOut }),
    ).toHaveAttribute("data-variant", "secondary");
    expect(
      screen.getByRole("heading", { level: 2, name: text.detailsTitle }),
    ).toHaveClass("font-bold", "text-blue");
  });

  it("offers a way back only when the header has none", async () => {
    stubApi();
    renderPage();
    await nameInput();
    expect(
      screen.queryByRole("link", { name: text.back }),
    ).not.toBeInTheDocument();
  });

  it("ACC-4 says so when the user is in no organisation", async () => {
    stubApi(undefined, { orgs: [] });
    renderPage();
    expect(await screen.findByText(text.orgs.none)).toBeVisible();
    expect(screen.getByRole("link", { name: text.back })).toHaveAttribute(
      "href",
      "/orgs",
    );
    expect(
      screen.queryByRole("list", { name: text.orgs.title }),
    ).not.toBeInTheDocument();
  });

  it("ACC-5 shows a labelled switch that is on by default", async () => {
    stubApi();
    renderPage();
    const sw = await screen.findByRole("switch", {
      name: new RegExp(
        `^${text.notifications.kinds.revalidation_reminder!.label}`,
      ),
    });
    expect(sw).toBeChecked();
  });

  it("ACC-5 saves a switch immediately", async () => {
    const fetch = stubApi();
    renderPage();
    const sw = await screen.findByRole("switch");
    await userEvent.click(sw);
    expect(await screen.findByText(text.notifications.saved)).toBeVisible();
    expect(sw).not.toBeChecked();
    const put = fetch.mock.calls.find(([r]) => r.method === "PUT")![0];
    expect(await put.json()).toEqual({
      settings: [{ kind: "revalidation_reminder", enabled: false }],
    });
  });

  it("ACC-5 shows a readable message when saving fails and keeps the switch", async () => {
    stubApi(undefined, {
      notificationsPut: () =>
        Response.json({ detail: "raw server text" }, { status: 500 }),
    });
    renderPage();
    const sw = await screen.findByRole("switch");
    await userEvent.click(sw);
    expect(await screen.findByText(text.notifications.failed)).toBeVisible();
    expect(screen.queryByText("raw server text")).not.toBeInTheDocument();
    expect(sw).toBeChecked();
  });

  it("ACC-5 shows a readable message when loading fails", async () => {
    stubApi(undefined, {
      notificationsGet: () => Response.json({ detail: "x" }, { status: 500 }),
    });
    renderPage();
    expect(
      await screen.findByText(text.notifications.loadFailed),
    ).toBeVisible();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });
});
