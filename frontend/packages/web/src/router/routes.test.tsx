import { ToastProvider } from "@ehds-relay/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Fragment } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  createTestSessionStore,
  demoSession,
  makeOrg,
} from "../session/testing";
import type { Session, SessionStore } from "../session/types";
import { shellMessages } from "../shell/messages";
import { createSessionStore } from "../session/store";
import { createRelayRouter } from "./router";

const twoOrgs: Session = {
  ...demoSession,
  orgs: [
    makeOrg(),
    makeOrg({
      id: "other",
      name: "Other org",
      country: "EL",
      role: "standard",
    }),
  ],
};

function renderApp(
  path: string,
  session: Session | null | SessionStore = demoSession,
  navigateExternal: (url: string) => void = vi.fn(),
) {
  const router = createRelayRouter({
    queryClient: new QueryClient(),
    session:
      session !== null && "load" in session
        ? session
        : createTestSessionStore(session),
    navigateExternal,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  // Signed-in pages can show toasts. Its alert region would confuse the sign-in message
  // tests, so signed-out visitors render without it.
  const Toasts = session === null ? Fragment : ToastProvider;
  render(
    <QueryClientProvider client={router.options.context.queryClient}>
      <Toasts>
        <RouterProvider router={router} />
      </Toasts>
    </QueryClientProvider>,
  );
  return router;
}

const pages = [
  ["/orgs/demo/catalogue", shellMessages.pages.catalogue.title],
  ["/orgs/demo/members", shellMessages.pages.members.title],
  ["/orgs/demo/settings", shellMessages.pages.settings.title],
] as const;

describe("org routes", () => {
  it.each(pages)("%s renders inside the shell", async (path, title) => {
    renderApp(path);
    expect(
      await screen.findByRole("heading", { level: 1, name: title }),
    ).toBeVisible();
    const header = screen.getByRole("banner");
    expect(
      within(header).getByRole("button", { name: "Open menu" }),
    ).toBeVisible();
    expect(screen.getByRole("main")).toContainElement(
      screen.getByRole("heading", { level: 1 }),
    );
  });

  it("redirects the org root to the catalogue", async () => {
    const router = renderApp("/orgs/demo");
    await screen.findByRole("heading", { name: "Dataset Catalogue" });
    expect(router.state.location.pathname).toBe("/orgs/demo/catalogue");
  });

  it("redirects the site root to the org picker when signed in", async () => {
    const router = renderApp("/", twoOrgs);
    await screen.findByRole("heading", { name: "Select your organisation" });
    expect(router.state.location.pathname).toBe("/orgs");
  });
});

describe("signed out", () => {
  it("redirects an org route to /sign-in with a redirect param", async () => {
    const router = renderApp("/orgs/demo/catalogue", null);
    await screen.findByRole("heading", { name: "Sign in" });
    expect(router.state.location.pathname).toBe("/sign-in");
    expect(router.state.location.search).toEqual({
      redirect: "/orgs/demo/catalogue",
    });
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
  });

  it("redirects the account page to /sign-in", async () => {
    const router = renderApp("/account", null);
    await screen.findByRole("heading", { name: "Sign in" });
    expect(router.state.location.pathname).toBe("/sign-in");
    expect(router.state.location.search).toEqual({ redirect: "/account" });
  });

  it("redirects the site root to /sign-in", async () => {
    const router = renderApp("/", null);
    await screen.findByRole("heading", { name: "Sign in" });
    expect(router.state.location.pathname).toBe("/sign-in");
  });

  it("sends Sign in to the API login with the requested page", async () => {
    renderApp("/orgs/demo/members", null);
    const signIn = await screen.findByRole("link", {
      name: shellMessages.signIn.action,
    });
    expect(signIn).toHaveAttribute(
      "href",
      "/api/v1/auth/login?redirect=%2Forgs%2Fdemo%2Fmembers",
    );
    expect(
      screen.getByRole("link", { name: shellMessages.signIn.createAccount }),
    ).toHaveAttribute(
      "href",
      "/api/v1/auth/login?redirect=%2Forgs%2Fdemo%2Fmembers&signup=true",
    );
  });

  it("ignores a redirect to another site", async () => {
    renderApp("/sign-in?redirect=https://evil.example/", null);
    expect(
      await screen.findByRole("link", { name: shellMessages.signIn.action }),
    ).toHaveAttribute("href", "/api/v1/auth/login?redirect=%2F");
  });

  it("shows a message after a failed sign-in", async () => {
    renderApp("/sign-in?error=signin_failed", null);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      shellMessages.signIn.failed,
    );
  });

  it("shows no message without an error", async () => {
    renderApp("/sign-in", null);
    await screen.findByRole("heading", { name: "Sign in" });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("organisation picker", () => {
  it("sends someone with no organisation to create one", async () => {
    const router = renderApp("/orgs", { ...demoSession, orgs: [] });
    await screen.findByRole("heading", { name: "Create an organisation" });
    expect(router.state.location.pathname).toBe("/orgs/new");
    expect(screen.getByText(shellMessages.newOrg.invitedHint)).toBeVisible();
  });

  it("sends someone with one organisation to its catalogue", async () => {
    const router = renderApp("/orgs");
    await screen.findByRole("heading", { name: "Dataset Catalogue" });
    expect(router.state.location.pathname).toBe("/orgs/demo/catalogue");
  });

  it("lists several organisations with their countries", async () => {
    const router = renderApp("/orgs", twoOrgs);
    await screen.findByRole("heading", { name: "Select your organisation" });
    expect(screen.getByRole("link", { name: /Demo org/ })).toHaveTextContent(
      "France",
    );
    expect(screen.getByRole("link", { name: /Other org/ })).toHaveTextContent(
      "Greece",
    );
    await userEvent.click(screen.getByRole("link", { name: /Other org/ }));
    await screen.findByRole("heading", { name: "Dataset Catalogue" });
    expect(router.state.location.pathname).toBe("/orgs/other/catalogue");
  });

  it("signs out from the picker", async () => {
    const navigateExternal = vi.fn();
    renderApp(
      "/orgs",
      createTestSessionStore(twoOrgs, { logoutUrl: "https://idp.test/out" }),
      navigateExternal,
    );
    await userEvent.click(
      await screen.findByRole("button", { name: shellMessages.signOut }),
    );
    await waitFor(() => {
      expect(navigateExternal).toHaveBeenCalledWith("https://idp.test/out");
    });
  });
});

describe("loading the session", () => {
  it("shows the error page with a retry when the API fails", async () => {
    let calls = 0;
    const store = createSessionStore({
      load: () => {
        calls += 1;
        return calls === 1
          ? Promise.reject(new Error("down"))
          : Promise.resolve(demoSession);
      },
      logout: () => Promise.resolve(null),
    });
    renderApp("/orgs/demo/catalogue", store);
    await screen.findByRole("heading", {
      name: shellMessages.serviceError.title,
    });
    await userEvent.click(
      screen.getByRole("button", { name: shellMessages.serviceError.retry }),
    );
    await screen.findByRole("heading", { name: "Dataset Catalogue" });
  });
});

describe("not found", () => {
  it("renders the page outside any organisation without the shell", async () => {
    renderApp("/nope");
    expect(
      await screen.findByRole("heading", {
        name: shellMessages.notFound.title,
      }),
    ).toBeVisible();
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
  });

  it("renders the page inside the shell for an unknown path in an org", async () => {
    renderApp("/orgs/demo/nope");
    const heading = await screen.findByRole("heading", {
      name: shellMessages.notFound.title,
    });
    expect(screen.getByRole("main")).toContainElement(heading);
    expect(
      within(screen.getByRole("banner")).getByRole("link", {
        name: shellMessages.header.backToCatalogue,
      }),
    ).toHaveAttribute("href", "/orgs/demo/catalogue");
  });

  it("treats an organisation the user is not in as missing", async () => {
    renderApp("/orgs/someone-else/catalogue");
    await screen.findByRole("heading", { name: shellMessages.notFound.title });
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
  });
});

describe("menu", () => {
  it("opens from the header and highlights the current page", async () => {
    renderApp("/orgs/demo/catalogue");
    await screen.findByRole("heading", { name: "Dataset Catalogue" });
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));

    const dialog = screen.getByRole("dialog", {
      name: shellMessages.menuTitle,
    });
    expect(
      within(dialog).getByRole("link", { name: "Catalogue" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(dialog).getByRole("link", { name: "Manage users" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("changes the route when a nav link is clicked, then closes", async () => {
    const router = renderApp("/orgs/demo/catalogue");
    await screen.findByRole("heading", { name: "Dataset Catalogue" });
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    await userEvent.click(screen.getByRole("link", { name: "Manage users" }));

    await screen.findByRole("heading", { level: 1, name: "Manage users" });
    expect(router.state.location.pathname).toBe("/orgs/demo/members");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("link", { name: "Manage users" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Catalogue" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("highlights the current item", async () => {
    renderApp("/orgs/demo/settings");
    await screen.findByRole("heading", { level: 1 });
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("hides Members from people who are not owners", async () => {
    renderApp("/orgs/demo/catalogue", {
      ...demoSession,
      orgs: [makeOrg({ role: "standard" })],
    });
    await screen.findByRole("heading", { name: "Dataset Catalogue" });
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(
      screen.queryByRole("link", { name: "Manage users" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Catalogue" })).toBeVisible();
  });

  it("hides Switch organisation with a single organisation", async () => {
    renderApp("/orgs/demo/catalogue");
    await screen.findByRole("heading", { name: "Dataset Catalogue" });
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(
      screen.queryByRole("link", { name: "Switch organisation" }),
    ).not.toBeInTheDocument();
  });

  it("goes to the org picker from Switch organisation", async () => {
    const router = renderApp("/orgs/demo/catalogue", twoOrgs);
    await screen.findByRole("heading", { name: "Dataset Catalogue" });
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    await userEvent.click(
      screen.getByRole("link", { name: "Switch organisation" }),
    );
    await screen.findByRole("heading", { name: "Select your organisation" });
    expect(router.state.location.pathname).toBe("/orgs");
  });

  it("opens the account page from Manage my account", async () => {
    const router = renderApp("/orgs/demo/catalogue");
    await screen.findByRole("heading", { name: "Dataset Catalogue" });
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    await userEvent.click(
      screen.getByRole("link", { name: "Manage my account" }),
    );
    await screen.findByRole("heading", {
      level: 1,
      name: shellMessages.account.title,
    });
    expect(router.state.location.pathname).toBe("/account");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("signs out to the address the API returns", async () => {
    const navigateExternal = vi.fn();
    renderApp(
      "/orgs/demo/catalogue",
      createTestSessionStore(demoSession, {
        logoutUrl: "https://idp.test/out",
      }),
      navigateExternal,
    );
    await screen.findByRole("heading", { name: "Dataset Catalogue" });
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    await userEvent.click(
      screen.getByRole("button", { name: shellMessages.logOut }),
    );
    await waitFor(() => {
      expect(navigateExternal).toHaveBeenCalledWith("https://idp.test/out");
    });
  });

  it("still ends on /sign-in when sign-out fails", async () => {
    const store = createTestSessionStore(demoSession, {
      logout: () => Promise.reject(new Error("down")),
    });
    const router = renderApp("/orgs/demo/catalogue", store);
    await screen.findByRole("heading", { name: "Dataset Catalogue" });
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    await userEvent.click(
      screen.getByRole("button", { name: shellMessages.logOut }),
    );
    await screen.findByRole("heading", { name: "Sign in" });
    expect(router.state.location.pathname).toBe("/sign-in");
    expect(store.get()).toBeNull();
  });

  it("signs out to /sign-in when there is no provider page", async () => {
    const router = renderApp("/orgs/demo/catalogue");
    await screen.findByRole("heading", { name: "Dataset Catalogue" });
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    await userEvent.click(
      screen.getByRole("button", { name: shellMessages.logOut }),
    );
    await screen.findByRole("heading", { name: "Sign in" });
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/sign-in");
    });
  });
});

describe("header", () => {
  const back = shellMessages.header.backToCatalogue;

  it("has no way back on the catalogue itself", async () => {
    renderApp("/orgs/demo/catalogue");
    await screen.findByRole("heading", { name: "Dataset Catalogue" });
    expect(
      within(screen.getByRole("banner")).queryByRole("link", { name: back }),
    ).not.toBeInTheDocument();
  });

  it("goes back to the catalogue from the other organisation pages", async () => {
    renderApp("/orgs/demo/members");
    await screen.findByRole("heading", { level: 1 });
    expect(
      within(screen.getByRole("banner")).getByRole("link", { name: back }),
    ).toHaveAttribute("href", "/orgs/demo/catalogue");
  });

  it("does not name the organisation", async () => {
    renderApp("/orgs/demo/catalogue");
    await screen.findByRole("heading", { name: "Dataset Catalogue" });
    expect(
      within(screen.getByRole("banner")).queryByText("Demo org"),
    ).not.toBeInTheDocument();
  });

  it("lists the menu in one list, account before the organisation pages", async () => {
    renderApp("/orgs/demo/catalogue", twoOrgs);
    await screen.findByRole("heading", { name: "Dataset Catalogue" });
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getAllByRole("navigation")).toHaveLength(1);
    expect(
      within(dialog)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual([
      "Catalogue",
      "Manage my account",
      "Manage users",
      "Settings",
      "Switch organisation",
    ]);
  });
});

describe("account header", () => {
  it("has the menu with the account entries and Log out, without an organisation", async () => {
    renderApp("/account", twoOrgs);
    await screen.findByRole("heading", {
      level: 1,
      name: shellMessages.account.title,
    });
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const dialog = screen.getByRole("dialog", {
      name: shellMessages.menuTitle,
    });
    expect(dialog).not.toHaveAccessibleDescription();
    expect(
      within(dialog)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Manage my account", "Switch organisation"]);
    expect(
      within(dialog).getByRole("link", { name: "Manage my account" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(dialog).getByRole("button", { name: shellMessages.logOut }),
    ).toBeVisible();
  });

  it("goes back to the only organisation's catalogue", async () => {
    renderApp("/account");
    await screen.findByRole("heading", { level: 1 });
    expect(
      within(screen.getByRole("banner")).getByRole("link", {
        name: shellMessages.header.backToCatalogue,
      }),
    ).toHaveAttribute("href", "/orgs/demo/catalogue");
  });

  it("goes back to the organisation list with several", async () => {
    renderApp("/account", twoOrgs);
    await screen.findByRole("heading", { level: 1 });
    expect(
      within(screen.getByRole("banner")).getByRole("link", {
        name: shellMessages.header.backToCatalogue,
      }),
    ).toHaveAttribute("href", "/orgs");
  });

  it("has no way back without an organisation", async () => {
    renderApp("/account", { ...demoSession, orgs: [] });
    await screen.findByRole("heading", { level: 1 });
    expect(
      within(screen.getByRole("banner")).queryByRole("link", {
        name: shellMessages.header.backToCatalogue,
      }),
    ).not.toBeInTheDocument();
  });
});
