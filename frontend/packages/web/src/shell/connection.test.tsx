import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { fieldAnchorId } from "../datasets/fields";
import {
  ID,
  ORG,
  base,
  json,
  makeDataset,
  renderApp,
  stubApi,
} from "../pages/datasetTestUtils";
import { shellMessages } from "./messages";

const text = shellMessages.connection;
const form = shellMessages.datasetForm;
const catalogue = `/orgs/${ORG}/catalogue`;
const edit = `/orgs/${ORG}/datasets/${ID}/edit`;
const list = `/api/v1/organisations/${ORG}/datasets`;

function setOnLine(value: boolean) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(value);
}

function goOffline() {
  act(() => {
    setOnLine(false);
    window.dispatchEvent(new Event("offline"));
  });
}

function goOnline() {
  act(() => {
    setOnLine(true);
    window.dispatchEvent(new Event("online"));
  });
}

function stubCatalogue() {
  return stubApi({ [`GET ${list}`]: () => json([]) });
}

const banner = () => screen.queryByText(text.offline);
const toast = () => screen.queryByText(text.backOnline);

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  // Query's online manager listens to these events and would stay paused otherwise.
  window.dispatchEvent(new Event("online"));
});

describe("connection banner and toast", () => {
  it("shows neither when the app opens online", async () => {
    setOnLine(true);
    stubCatalogue();
    renderApp(catalogue);
    await screen.findByRole("banner");
    expect(banner()).toBeNull();
    expect(toast()).toBeNull();
  });

  it("shows the banner when the app opens offline, and no toast", async () => {
    setOnLine(false);
    stubCatalogue();
    renderApp(catalogue);
    expect(await screen.findByText(text.offline)).toBeVisible();
    expect(toast()).toBeNull();
  });

  it("shows a warning alert under the header with no Dismiss", async () => {
    setOnLine(true);
    stubCatalogue();
    renderApp(catalogue);
    const header = await screen.findByRole("banner");
    goOffline();
    const alert = (await screen.findByText(text.offline)).closest(
      "[role=alert]",
    ) as HTMLElement;
    expect(alert).toBeVisible();
    expect(
      header.compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(within(alert).queryByRole("button")).toBeNull();
  });

  it("shows it on the account page too", async () => {
    setOnLine(false);
    stubCatalogue();
    renderApp("/account");
    expect(await screen.findByText(text.offline)).toBeVisible();
  });

  it("shows it on a page without the app header", async () => {
    setOnLine(false);
    renderApp("/sign-in");
    expect(await screen.findByText(text.offline)).toBeVisible();
  });

  it("removes the banner and shows a success toast that closes after 5 seconds", async () => {
    setOnLine(true);
    stubCatalogue();
    renderApp(catalogue);
    await screen.findByRole("banner");
    goOffline();
    expect(await screen.findByText(text.offline)).toBeVisible();

    vi.useFakeTimers({ shouldAdvanceTime: true });
    goOnline();
    expect(banner()).toBeNull();
    expect(screen.getAllByText(text.backOnline)).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(5100);
    });
    expect(toast()).toBeNull();
  });

  it("closes the toast when the connection drops again", async () => {
    setOnLine(true);
    stubCatalogue();
    renderApp(catalogue);
    await screen.findByRole("banner");
    goOffline();
    goOnline();
    expect(await screen.findByText(text.backOnline)).toBeVisible();
    goOffline();
    await waitFor(() => {
      expect(toast()).toBeNull();
    });
    expect(banner()).not.toBeNull();
  });

  it("shows one toast even when the layout changes", async () => {
    setOnLine(false);
    stubCatalogue();
    const router = renderApp(catalogue);
    await screen.findByText(text.offline);
    await act(async () => {
      await router.navigate({ to: "/account" });
    });
    goOnline();
    expect(await screen.findAllByText(text.backOnline)).toHaveLength(1);
  });
});

describe("saving the dataset form offline", () => {
  async function openEdit() {
    stubApi({
      [`GET ${base}`]: () => json(makeDataset({ status: "draft" })),
      [`GET ${list}`]: () => json([]),
    });
    renderApp(edit);
    await screen.findByRole("form", { name: form.formLabel });
  }

  async function saveDraft() {
    await userEvent.click(
      await screen.findByRole("button", { name: form.actions.saveMenu }),
    );
    await userEvent.click(
      await screen.findByRole("menuitem", { name: form.actions.saveDraft }),
    );
  }

  const titleBox = () =>
    within(document.getElementById(fieldAnchorId("title"))!).getByLabelText(
      form.fields.title,
    );

  function failRequests() {
    const original = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: Request | string) => {
        const request = typeof input === "string" ? new Request(input) : input;
        if (request.method === "PUT") throw new TypeError("Failed to fetch");
        return original(input);
      }),
    );
  }

  it("says nothing was saved and keeps the changes", async () => {
    setOnLine(true);
    await openEdit();
    await userEvent.type(titleBox(), " changed");
    failRequests();
    goOffline();
    await saveDraft();
    expect(await screen.findByText(form.status.offline)).toBeVisible();
    expect(titleBox()).toHaveValue("Hospital Admissions changed");
  });

  it("keeps the generic message when the save fails while online", async () => {
    setOnLine(true);
    await openEdit();
    failRequests();
    await saveDraft();
    expect(await screen.findByText(form.status.failed)).toBeVisible();
    expect(screen.queryByText(form.status.offline)).toBeNull();
  });

  it("stays on the page after Save and leave while offline", async () => {
    setOnLine(true);
    await openEdit();
    await userEvent.type(titleBox(), " changed");
    failRequests();
    goOffline();
    await userEvent.click(
      screen.getByRole("link", { name: shellMessages.header.backToCatalogue }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: form.leave.saveAndLeave }),
    );
    expect(await screen.findByText(form.status.offline)).toBeVisible();
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).toBeNull();
    });
    expect(titleBox()).toHaveValue("Hospital Admissions changed");
  });
});
