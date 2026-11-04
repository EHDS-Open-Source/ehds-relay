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

const text = shellMessages.settings;
const path = "/orgs/demo/settings";
// The required star adds hidden text to the label, so match on the start.
const nameLabel = new RegExp(`^${text.nameLabel}`);
const countryLabel = new RegExp(`^${text.countryLabel}`);

/** An API holding one organisation that a PATCH changes, as the real one would. */
function stubApi(
  role: "owner" | "standard",
  patch?: (request: Request) => Response | Promise<Response>,
) {
  let org = makeOrg({ role });
  const patches: Request[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: Request) => {
      const url = new URL(request.url).pathname;
      if (url === "/api/v1/me") return Response.json(demoSession.user);
      if (url === "/api/v1/organisations/demo" && request.method === "PATCH") {
        patches.push(request.clone());
        if (patch) return patch(request);
        org = { ...org, ...((await request.json()) as Partial<typeof org>) };
        return Response.json(org);
      }
      if (url === "/api/v1/organisations")
        return Response.json([
          org,
          makeOrg({ id: "other", name: "Other org", country: "DE" }),
        ]);
      if (url.endsWith("/datasets")) return Response.json([]);
      return Response.json({ status: "ok" });
    }),
  );
  return patches;
}

function renderPage() {
  const queryClient = new QueryClient();
  const router = createRelayRouter({
    queryClient,
    session: createApiSessionStore(api),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return router;
}

const save = () =>
  userEvent.click(screen.getByRole("button", { name: text.save }));

describe("MGT-6 organisation settings", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("MGT-6: an owner saves a new name and country that show everywhere at once", async () => {
    const patches = stubApi("owner");
    const router = renderPage();
    const name = await screen.findByLabelText(nameLabel);
    expect(name).toHaveValue("Demo org");
    expect(screen.getByLabelText(countryLabel)).toHaveValue("FR");
    await userEvent.clear(name);
    await userEvent.type(name, "Acme Health");
    await userEvent.selectOptions(
      screen.getByLabelText(countryLabel),
      "Greece",
    );
    await save();

    expect(
      await screen.findByRole("button", { name: text.saved }),
    ).toBeVisible();
    expect(await patches[0]!.json()).toEqual({
      name: "Acme Health",
      country: "EL",
    });
    await userEvent.click(
      within(screen.getByRole("banner")).getByRole("button", {
        name: "Open menu",
      }),
    );
    expect(screen.getByRole("dialog")).toHaveAccessibleDescription(
      "Acme Health",
    );
    await userEvent.keyboard("{Escape}");

    await router.navigate({ to: "/orgs" });
    await waitFor(() => {
      expect(screen.getByRole("main")).toHaveTextContent("Acme Health");
    });
    expect(screen.getByRole("main")).toHaveTextContent("Greece");
  });

  it("MGT-6: the Saved state goes back to Save changes after a moment", async () => {
    stubApi("owner");
    renderPage();
    await screen.findByLabelText(nameLabel);
    await save();
    await screen.findByRole("button", { name: text.saved });
    expect(
      await screen.findByRole("button", { name: text.save }, { timeout: 3000 }),
    ).toBeVisible();
  });

  it("MGT-6: name and country are marked required", async () => {
    stubApi("owner");
    renderPage();
    const name = await screen.findByLabelText(nameLabel);
    expect(name.closest("div")).toHaveTextContent("(required)");
    expect(
      screen.getByLabelText(countryLabel).closest("div"),
    ).toHaveTextContent("(required)");
  });

  it("MGT-6: the fields sit in a 560px card, with a country hint and Save changes below", async () => {
    stubApi("owner");
    renderPage();
    const name = await screen.findByLabelText(nameLabel);
    const card = name.closest("[class*=shadow-card]")!;
    expect(card).toHaveClass("max-w-[560px]", "rounded-card", "p-8");
    const country = screen.getByLabelText(countryLabel);
    expect(country).toHaveAccessibleDescription(text.countryHint);
    const button = screen.getByRole("button", { name: text.save });
    expect(card).not.toContainElement(button);
    expect(button.lastElementChild).toHaveAttribute("data-icon", "save");
  });

  it("MGT-6: an empty name is explained and nothing is sent", async () => {
    const patches = stubApi("owner");
    renderPage();
    await userEvent.clear(await screen.findByLabelText(nameLabel));
    await save();
    expect(screen.getByText(text.nameRequired)).toBeVisible();
    expect(screen.getByLabelText(nameLabel)).toHaveFocus();
    expect(patches).toHaveLength(0);
  });

  it("MGT-6: a name over 200 characters is explained and nothing is sent", async () => {
    const patches = stubApi("owner");
    renderPage();
    const name = await screen.findByLabelText(nameLabel);
    await userEvent.clear(name);
    await userEvent.click(name);
    await userEvent.paste("a".repeat(201));
    await save();
    expect(screen.getByText(text.nameTooLong)).toBeVisible();
    expect(patches).toHaveLength(0);
  });

  it("MGT-6: a standard member sees no menu item and an owners-only message", async () => {
    stubApi("standard");
    renderPage();
    expect(await screen.findByText(text.ownersOnly)).toBeVisible();
    expect(screen.queryByLabelText(nameLabel)).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.queryByRole("link", { name: "Settings" })).toBeNull();
  });

  it("MGT-6: a refusal for lack of rights is shown as a sentence", async () => {
    stubApi("owner", () =>
      Response.json({ detail: "Forbidden" }, { status: 403 }),
    );
    renderPage();
    await screen.findByLabelText(nameLabel);
    await save();
    expect(await screen.findByText(text.errors.forbidden)).toBeVisible();
    expect(screen.queryByText("Forbidden")).toBeNull();
  });

  it("MGT-6: rejected details and service failures are shown as sentences", async () => {
    let status = 422;
    stubApi("owner", () => Response.json({ detail: [] }, { status }));
    renderPage();
    await screen.findByLabelText(nameLabel);
    await save();
    expect(await screen.findByText(text.errors.invalid)).toBeVisible();
    status = 500;
    await save();
    expect(await screen.findByText(text.errors.failed)).toBeVisible();
  });
});
