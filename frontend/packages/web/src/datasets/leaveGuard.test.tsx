import { ToastProvider } from "@ehds-relay/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createBrowserHistory,
  createMemoryHistory,
} from "@tanstack/react-router";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  ID,
  ORG,
  base,
  json,
  makeDataset,
  stubApi,
} from "../pages/datasetTestUtils";
import { createRelayRouter } from "../router/router";
import { createTestSessionStore, makeOrg } from "../session/testing";
import type { Session } from "../session/types";
import { shellMessages } from "../shell/messages";
import { fieldAnchorId } from "./fields";
import { LeaveDialog } from "./LeaveDialog";

const form = shellMessages.datasetForm;
const leave = form.leave;
const record = `/orgs/${ORG}/datasets/${ID}`;
const edit = `${record}/edit`;
const catalogue = `/orgs/${ORG}/catalogue`;
const list = `/api/v1/organisations/${ORG}/datasets`;

const session: Session = {
  user: { id: "u1", name: "Demo User", email: "demo@example.org" },
  orgs: [makeOrg({ id: ORG }), makeOrg({ id: "other", name: "Other org" })],
};

function renderRoute(
  path: string,
  options: {
    logout?: () => Promise<string | null>;
    navigateExternal?: (url: string) => void;
    browserHistory?: boolean;
  } = {},
) {
  const router = createRelayRouter({
    queryClient: new QueryClient({
      defaultOptions: { queries: { retry: false } },
    }),
    session: createTestSessionStore(session, { logout: options.logout }),
    navigateExternal: options.navigateExternal,
    history: options.browserHistory
      ? createBrowserHistory()
      : createMemoryHistory({ initialEntries: [path] }),
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

const draft = (overrides = {}) =>
  makeDataset({ status: "draft", ...overrides });

function stubEdit(
  put?: (request: Request) => Response | Promise<Response>,
  dataset = draft(),
) {
  return stubApi({
    [`GET ${base}`]: () => json(dataset),
    [`GET ${list}`]: () => json([]),
    ...(put ? { [`PUT ${base}`]: put } : {}),
  });
}

const titleBox = () =>
  within(document.getElementById(fieldAnchorId("title"))!).getByLabelText(
    form.fields.title,
  );

async function openEdit() {
  const router = renderRoute(edit);
  await screen.findByRole("form", { name: form.formLabel });
  return router;
}

async function change() {
  await userEvent.type(titleBox(), " changed");
}

const backLink = () =>
  screen.getByRole("link", { name: shellMessages.header.backToCatalogue });

async function dialog() {
  return await screen.findByRole("alertdialog", { name: leave.title });
}

const noDialog = () => {
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
};

const puts = (calls: Request[]) => calls.filter((c) => c.method === "PUT");

async function openMenu() {
  await userEvent.click(screen.getByRole("button", { name: /^open menu$/i }));
}

describe("leaving the edit page", () => {
  it("goes straight through when nothing changed, or the change was undone", async () => {
    stubEdit();
    const router = await openEdit();
    await userEvent.type(titleBox(), "x");
    await userEvent.type(titleBox(), "{Backspace}");
    await userEvent.click(backLink());
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(catalogue);
    });
    noDialog();
  });

  it("asks, naming the dataset, with Keep editing focused", async () => {
    stubEdit();
    await openEdit();
    await change();
    await userEvent.click(backLink());
    const box = await dialog();
    expect(within(box).getByText("Hospital Admissions changed")).toBeVisible();
    expect(within(box).getByText("Hospital Admissions changed").tagName).toBe(
      "STRONG",
    );
    expect(
      within(box)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual([leave.keepEditing, leave.leave, leave.saveAndLeave]);
    expect(
      within(box).getByRole("button", { name: leave.keepEditing }),
    ).toHaveFocus();
  });

  it.each([
    [
      "Keep editing",
      async () => {
        await userEvent.click(
          screen.getByRole("button", { name: leave.keepEditing }),
        );
      },
    ],
    [
      "Esc",
      async () => {
        await userEvent.keyboard("{Escape}");
      },
    ],
    [
      "a click outside",
      async () => {
        const overlay = document.querySelector<HTMLElement>(
          "[data-slot=alert-dialog-overlay]",
        )!;
        await userEvent.click(overlay);
      },
    ],
  ])("stays on the form with the edit after %s", async (_name, choose) => {
    stubEdit();
    const router = await openEdit();
    await change();
    const opener = backLink();
    opener.focus();
    await userEvent.click(opener);
    await dialog();
    await choose();
    await waitFor(noDialog);
    expect(router.state.location.pathname).toBe(edit);
    expect(titleBox()).toHaveValue("Hospital Admissions changed");
    await waitFor(() => {
      expect(opener).toHaveFocus();
    });
  });

  it("leaves without saving", async () => {
    const calls = stubEdit();
    const router = await openEdit();
    await change();
    await userEvent.click(backLink());
    await dialog();
    await userEvent.click(screen.getByRole("button", { name: leave.leave }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(catalogue);
    });
    expect(puts(calls)).toHaveLength(0);
  });

  it("saves once with the version read, then goes where the user chose", async () => {
    const bodies: unknown[] = [];
    const calls = stubEdit(async (request) => {
      bodies.push(await request.json());
      return json(draft({ version: 4 }));
    });
    const router = await openEdit();
    await change();
    await userEvent.click(backLink());
    await dialog();
    await userEvent.click(
      screen.getByRole("button", { name: leave.saveAndLeave }),
    );
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(catalogue);
    });
    expect(puts(calls)).toHaveLength(1);
    expect(bodies[0]).toMatchObject({ version: 3, publish: false });
    noDialog();
  });

  it("keeps a published dataset published when saving on the way out", async () => {
    const bodies: unknown[] = [];
    stubEdit(async (request) => {
      bodies.push(await request.json());
      return json(makeDataset({ version: 4 }));
    }, makeDataset());
    const router = await openEdit();
    await change();
    await userEvent.click(backLink());
    await dialog();
    await userEvent.click(
      screen.getByRole("button", { name: leave.saveAndLeave }),
    );
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(catalogue);
    });
    // The same request as "Save and keep published"
    expect(bodies[0]).toMatchObject({ unpublish: false });
  });

  it("stays, with the field error shown and focused, when the server rejects it", async () => {
    stubEdit(() =>
      json(
        {
          detail: [
            {
              loc: ["body", "metadata", "quantum_label"],
              msg: "not valid Turtle",
              type: "value_error",
            },
          ],
        },
        422,
      ),
    );
    const router = await openEdit();
    await change();
    await userEvent.click(backLink());
    await dialog();
    await userEvent.click(
      screen.getByRole("button", { name: leave.saveAndLeave }),
    );
    expect(await screen.findByText(form.status.fixErrors)).toBeVisible();
    await waitFor(noDialog);
    expect(router.state.location.pathname).toBe(edit);
    const box = within(
      document.getElementById(fieldAnchorId("quantum_label"))!,
    ).getByRole("textbox");
    await waitFor(() => {
      expect(box).toHaveFocus();
    });
  });

  it("stays with the conflict feedback when someone else saved", async () => {
    stubEdit(() => json({ detail: "stale" }, 409));
    const router = await openEdit();
    await change();
    await userEvent.click(backLink());
    await dialog();
    await userEvent.click(
      screen.getByRole("button", { name: leave.saveAndLeave }),
    );
    expect(await screen.findByText(form.status.conflict)).toBeVisible();
    await waitFor(noDialog);
    expect(router.state.location.pathname).toBe(edit);
  });

  it("asks for a menu destination, the organisation list and the logo", async () => {
    stubEdit();
    const router = await openEdit();
    await change();

    await openMenu();
    await userEvent.click(
      await screen.findByRole("link", { name: /Switch organisation/ }),
    );
    await dialog();
    await userEvent.click(
      screen.getByRole("button", { name: leave.keepEditing }),
    );
    await waitFor(noDialog);

    await userEvent.click(
      screen.getAllByRole("link", { name: shellMessages.appName })[0]!,
    );
    await dialog();
    await userEvent.click(
      screen.getByRole("button", { name: leave.keepEditing }),
    );
    await waitFor(noDialog);

    await openMenu();
    await userEvent.click(
      await screen.findByRole("link", { name: /Manage my account/ }),
    );
    await dialog();
    await userEvent.click(screen.getByRole("button", { name: leave.leave }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/account");
    });
  });

  it("asks for the browser's Back", async () => {
    stubEdit();
    // Memory history does not hold back Back, so this one uses the browser's
    window.history.replaceState({}, "", catalogue);
    const router = renderRoute(catalogue, { browserHistory: true });
    await screen.findByRole("heading", { name: "Dataset Catalogue" });
    await router.navigate({
      to: "/orgs/$orgId/datasets/$datasetId/edit",
      params: { orgId: ORG, datasetId: ID },
    });
    await screen.findByRole("form", { name: form.formLabel });
    await change();
    window.history.back();
    await dialog();
    await userEvent.click(
      screen.getByRole("button", { name: leave.keepEditing }),
    );
    await waitFor(noDialog);
    expect(router.state.location.pathname).toBe(edit);
    window.history.back();
    await dialog();
    await userEvent.click(screen.getByRole("button", { name: leave.leave }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(catalogue);
    });
  });

  it("does not ask after a successful save, or for links within the form", async () => {
    stubEdit(() => json(draft({ version: 4 })));
    const router = await openEdit();
    await change();
    await userEvent.click(
      screen.getByRole("button", { name: form.actions.saveMenu }),
    );
    await userEvent.click(
      await screen.findByRole("menuitem", { name: form.actions.saveDraft }),
    );
    expect(await screen.findByText(form.status.savedDraft)).toBeVisible();
    await userEvent.click(backLink());
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(catalogue);
    });
    noDialog();
  });

  it("does not ask for section links or a #field link on the same page", async () => {
    stubEdit();
    const router = await openEdit();
    await change();
    await router.navigate({
      to: "/orgs/$orgId/datasets/$datasetId/edit",
      params: { orgId: ORG, datasetId: ID },
      hash: "field-title",
    });
    const sections = screen.getAllByRole("link", {
      name: form.sections.access,
    });
    await userEvent.click(sections[0]!);
    noDialog();
    expect(router.state.location.pathname).toBe(edit);
  });
});

describe("Log out with unsaved changes", () => {
  async function logOut() {
    await openMenu();
    await userEvent.click(
      await screen.findByRole("button", { name: shellMessages.logOut }),
    );
  }

  it("signs out straight away when nothing changed", async () => {
    stubEdit();
    const logout = vi.fn(() => Promise.resolve("https://idp.test/out"));
    const navigateExternal = vi.fn();
    renderRoute(edit, { logout, navigateExternal });
    await screen.findByRole("form", { name: form.formLabel });
    await logOut();
    await waitFor(() => {
      expect(navigateExternal).toHaveBeenCalledWith("https://idp.test/out");
    });
  });

  it("keeps the session when the user keeps editing", async () => {
    stubEdit();
    const logout = vi.fn(() => Promise.resolve(null));
    renderRoute(edit, { logout });
    await screen.findByRole("form", { name: form.formLabel });
    await change();
    await logOut();
    await dialog();
    await userEvent.click(
      screen.getByRole("button", { name: leave.keepEditing }),
    );
    await waitFor(noDialog);
    expect(logout).not.toHaveBeenCalled();
    expect(titleBox()).toHaveValue("Hospital Admissions changed");
  });

  it("signs out after Leave without saving, without saving", async () => {
    const calls = stubEdit();
    const logout = vi.fn(() => Promise.resolve("https://idp.test/out"));
    const navigateExternal = vi.fn();
    renderRoute(edit, { logout, navigateExternal });
    await screen.findByRole("form", { name: form.formLabel });
    await change();
    await logOut();
    await dialog();
    await userEvent.click(screen.getByRole("button", { name: leave.leave }));
    await waitFor(() => {
      expect(navigateExternal).toHaveBeenCalledWith("https://idp.test/out");
    });
    expect(puts(calls)).toHaveLength(0);
  });

  it("saves, then signs out, after Save and leave", async () => {
    const calls = stubEdit(() => json(draft({ version: 4 })));
    const logout = vi.fn(() => Promise.resolve("https://idp.test/out"));
    const navigateExternal = vi.fn();
    renderRoute(edit, { logout, navigateExternal });
    await screen.findByRole("form", { name: form.formLabel });
    await change();
    await logOut();
    await dialog();
    await userEvent.click(
      screen.getByRole("button", { name: leave.saveAndLeave }),
    );
    await waitFor(() => {
      expect(navigateExternal).toHaveBeenCalledWith("https://idp.test/out");
    });
    expect(puts(calls)).toHaveLength(1);
  });
});

describe("leaving the add page", () => {
  const created = draft({ id: "new-1" });

  function stubNew() {
    return stubApi({
      [`GET ${list}`]: () => json([]),
      [`POST ${list}`]: () => json(created, 201),
      [`GET ${list}/new-1`]: () => json(created),
    });
  }

  async function openNew() {
    const router = renderRoute(`/orgs/${ORG}/datasets/new`);
    await screen.findByRole("form", { name: form.formLabel });
    return router;
  }

  it("asks after typing", async () => {
    stubNew();
    const router = await openNew();
    await userEvent.type(titleBox(), "My data");
    await userEvent.click(backLink());
    const box = await dialog();
    expect(within(box).getByText("My data").tagName).toBe("STRONG");
    await userEvent.click(screen.getByRole("button", { name: leave.leave }));
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(catalogue);
    });
  });

  it("moves to the edit page after the first save without asking", async () => {
    stubNew();
    const router = await openNew();
    await userEvent.type(titleBox(), "My data");
    await userEvent.click(
      screen.getByRole("button", { name: form.actions.saveMenu }),
    );
    await userEvent.click(
      await screen.findByRole("menuitem", { name: form.actions.saveDraft }),
    );
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(
        `/orgs/${ORG}/datasets/new-1/edit`,
      );
    });
    noDialog();
  });

  it("creates the dataset on Save and leave and lands on the chosen page", async () => {
    const calls = stubNew();
    const router = await openNew();
    await userEvent.type(titleBox(), "My data");
    await userEvent.click(backLink());
    await dialog();
    await userEvent.click(
      screen.getByRole("button", { name: leave.saveAndLeave }),
    );
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(catalogue);
    });
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(1);
  });

  it("stays with the title error when there is no title", async () => {
    const calls = stubNew();
    const router = await openNew();
    // Changed, but without a title
    await userEvent.type(
      within(document.getElementById(fieldAnchorId("keyword"))!).getByRole(
        "textbox",
      ),
      "a{Enter}",
    );
    await userEvent.click(backLink());
    const box = await dialog();
    expect(box).toHaveTextContent(leave.descriptionUntitled);
    await userEvent.click(
      screen.getByRole("button", { name: leave.saveAndLeave }),
    );
    expect(
      (await screen.findAllByText(form.status.titleRequired)).length,
    ).toBeGreaterThan(0);
    await waitFor(noDialog);
    expect(router.state.location.pathname).toBe(`/orgs/${ORG}/datasets/new`);
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(0);
    await waitFor(() => {
      expect(titleBox()).toHaveFocus();
    });
  });
});

describe("closing the tab", () => {
  it("shows the browser's prompt only with unsaved changes", async () => {
    stubEdit();
    window.history.replaceState({}, "", edit);
    renderRoute(edit, { browserHistory: true });
    await screen.findByRole("form", { name: form.formLabel });
    const fire = () => {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(fire()).toBe(false);
    await change();
    expect(fire()).toBe(true);
  });
});

describe("LeaveDialog", () => {
  const noop = () => {};

  it("is busy while saving: Keep editing and Leave are off", () => {
    render(
      <LeaveDialog
        open
        pending
        datasetTitle="Data"
        onKeepEditing={noop}
        onLeave={noop}
        onSave={noop}
      />,
    );
    expect(
      screen.getByRole("button", { name: leave.keepEditing }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: leave.leave })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: leave.saveAndLeave }),
    ).toHaveAttribute("aria-busy", "true");
  });

  it("uses the untitled wording without a title", () => {
    render(
      <LeaveDialog open onKeepEditing={noop} onLeave={noop} onSave={noop} />,
    );
    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      leave.descriptionUntitled,
    );
  });
});
