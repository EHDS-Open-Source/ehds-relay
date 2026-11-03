import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  createStubSessionStore,
  demoSession,
  type Session,
} from "../session/stub";
import { shellMessages } from "../shell/messages";
import { createRelayRouter } from "./router";

function renderApp(path: string, session: Session | null = demoSession) {
  const router = createRelayRouter({
    queryClient: new QueryClient(),
    session: createStubSessionStore(session),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  render(
    <QueryClientProvider client={router.options.context.queryClient}>
      <RouterProvider router={router} />
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
    expect(within(header).getByText("Demo org")).toBeVisible();
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
    const router = renderApp("/");
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

  it("redirects the site root to /sign-in", async () => {
    const router = renderApp("/", null);
    await screen.findByRole("heading", { name: "Sign in" });
    expect(router.state.location.pathname).toBe("/sign-in");
  });

  it("returns to the requested page after signing in", async () => {
    const router = renderApp("/orgs/demo/members", null);
    await userEvent.click(
      await screen.findByRole("button", {
        name: shellMessages.signIn.continue,
      }),
    );
    await screen.findByRole("heading", { name: "Members" });
    expect(router.state.location.pathname).toBe("/orgs/demo/members");
  });

  it("ignores a redirect to another site", async () => {
    const router = renderApp("/sign-in?redirect=https://evil.example/", null);
    await userEvent.click(
      await screen.findByRole("button", {
        name: shellMessages.signIn.continue,
      }),
    );
    await screen.findByRole("heading", { name: "Select your organisation" });
    expect(router.state.location.pathname).toBe("/orgs");
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
      within(screen.getByRole("banner")).getByText("Demo org"),
    ).toBeVisible();
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
      within(dialog).getByRole("link", { name: "Members" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("changes the route when a nav link is clicked, then closes", async () => {
    const router = renderApp("/orgs/demo/catalogue");
    await screen.findByRole("heading", { name: "Dataset Catalogue" });
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    await userEvent.click(screen.getByRole("link", { name: "Members" }));

    await screen.findByRole("heading", { level: 1, name: "Members" });
    expect(router.state.location.pathname).toBe("/orgs/demo/members");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("link", { name: "Members" })).toHaveAttribute(
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
      orgs: [{ id: "demo", name: "Demo org", role: "standard" }],
    });
    await screen.findByRole("heading", { name: "Dataset Catalogue" });
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(
      screen.queryByRole("link", { name: "Members" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Catalogue" })).toBeVisible();
  });

  it("goes to the org picker from Switch organisation", async () => {
    const router = renderApp("/orgs/demo/catalogue");
    await screen.findByRole("heading", { name: "Dataset Catalogue" });
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    await userEvent.click(
      screen.getByRole("link", { name: "Switch organisation" }),
    );
    await screen.findByRole("heading", { name: "Select your organisation" });
    expect(router.state.location.pathname).toBe("/orgs");
  });

  it("signs out to /sign-in", async () => {
    const router = renderApp("/orgs/demo/catalogue");
    await screen.findByRole("heading", { name: "Dataset Catalogue" });
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    await userEvent.click(
      screen.getByRole("button", { name: shellMessages.signOut }),
    );
    await screen.findByRole("heading", { name: "Sign in" });
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/sign-in");
    });
  });
});
