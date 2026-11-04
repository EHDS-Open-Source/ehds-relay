import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { datasetStarColour } from "@ehds-relay/ui";
import { noRevalidationData } from "../datasets/fakeServer";
import { createRelayRouter } from "../router/router";
import { createTestSessionStore } from "../session/testing";
import { shellMessages } from "../shell/messages";

const text = shellMessages.catalogue;
const original = globalThis.fetch;

function dataset(
  id: string,
  metadata: object,
  status = "published",
  overdue = false,
) {
  return {
    ...noRevalidationData,
    overdue,
    id,
    org_id: "demo",
    title: null,
    description: null,
    status,
    metadata,
    schema_version: "1",
    version: 1,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    missing_for_publish: [],
  };
}

const sample = [
  dataset(
    "d1",
    {
      title: [{ lang: "en", text: "Diabetes Registry" }],
      description: [{ lang: "en", text: "Adult patients" }],
      keyword: ["insulin"],
      access_rights: "public",
    },
    "draft",
  ),
  dataset(
    "d2",
    {
      title: [{ lang: "en", text: "Cancer Cohort" }],
      access_rights: "restricted",
    },
    "published",
    true,
  ),
  dataset("d3", { title: [{ lang: "en", text: "Unlabelled" }] }),
];

function stubDatasets(respond: () => Response) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = input instanceof Request ? input.url : String(input);
    return Promise.resolve(
      url.includes("/datasets")
        ? respond()
        : new Response(JSON.stringify({ status: "ok" }), {
            headers: { "Content-Type": "application/json" },
          }),
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function renderAt(path: string) {
  const router = createRelayRouter({
    queryClient: new QueryClient({
      defaultOptions: { queries: { retry: false } },
    }),
    session: createTestSessionStore(),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  render(
    <QueryClientProvider client={router.options.context.queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

afterEach(() => vi.stubGlobal("fetch", original));

describe("catalogue", () => {
  it("shows one card per dataset with a Draft chip on drafts only", async () => {
    stubDatasets(() => json(sample));
    renderAt("/orgs/demo/catalogue");
    expect(await screen.findByText("Diabetes Registry")).toBeVisible();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getAllByText("Draft")).toHaveLength(1);
    expect(screen.getByRole("link", { name: /Cancer Cohort/ })).toHaveAttribute(
      "href",
      "/orgs/demo/datasets/d2",
    );
    expect(screen.getByRole("link", { name: text.addDataset })).toHaveAttribute(
      "href",
      "/orgs/demo/datasets/new",
    );
  });

  it("searches as the user types and keeps it in the URL", async () => {
    stubDatasets(() => json(sample));
    const router = renderAt("/orgs/demo/catalogue");
    await screen.findByText("Diabetes Registry");
    await userEvent.type(screen.getByRole("searchbox"), "INSULIN");
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    await waitFor(() =>
      expect(router.state.location.search).toEqual({ q: "INSULIN" }),
    );
  });

  it("combines the access chip with search; no-level datasets only under All", async () => {
    stubDatasets(() => json(sample));
    const router = renderAt("/orgs/demo/catalogue");
    await screen.findByText("Diabetes Registry");
    await userEvent.click(
      screen.getByRole("button", { name: text.access.restricted }),
    );
    expect(
      screen.getByRole("button", { name: text.access.restricted }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.queryByText("Unlabelled")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(router.state.location.search).toEqual({ access: "restricted" }),
    );
  });

  it("restores search and chip from the URL", async () => {
    stubDatasets(() => json(sample));
    renderAt("/orgs/demo/catalogue?q=cohort&access=restricted");
    expect(await screen.findByText("Cancer Cohort")).toBeVisible();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("searchbox")).toHaveValue("cohort");
    expect(
      screen.getByRole("button", { name: text.access.restricted }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("EDIT-14 shows the overdue band on overdue cards only", async () => {
    stubDatasets(() => json(sample));
    renderAt("/orgs/demo/catalogue");
    await screen.findByText("Diabetes Registry");
    const flagged = screen
      .getAllByRole("listitem")
      .filter((item) => item.querySelector("[data-band='overdue']"));
    expect(flagged).toHaveLength(1);
    expect(
      screen.getByRole("link", { name: /Cancer Cohort/ }),
    ).toHaveTextContent(text.overdue);
  });

  it("EDIT-14 filters to overdue datasets and keeps it in the URL", async () => {
    stubDatasets(() => json(sample));
    const router = renderAt("/orgs/demo/catalogue");
    await screen.findByText("Diabetes Registry");
    const toggle = screen.getByRole("button", { name: text.overdueFilter });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(toggle);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("Cancer Cohort")).toBeVisible();
    await waitFor(() =>
      expect(router.state.location.search).toEqual({ overdue: true }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: text.overdueFilter }),
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("offers the overdue filter only when something is overdue", async () => {
    stubDatasets(() => json([sample[0], sample[2]]));
    renderAt("/orgs/demo/catalogue");
    await screen.findByText("Diabetes Registry");
    expect(
      screen.queryByRole("button", { name: text.overdueFilter }),
    ).not.toBeInTheDocument();
  });

  it("EDIT-14 marks a card overdue once its reminder date has passed", async () => {
    stubDatasets(() =>
      json([{ ...sample[2], reminder_date: "2020-06-30", overdue: false }]),
    );
    renderAt("/orgs/demo/catalogue");
    const card = await screen.findByRole("link", { name: /Unlabelled/ });
    expect(card).toHaveTextContent(`${text.overdueSince} 30 June 2020`);
    expect(card.querySelector("[data-band='overdue']")).not.toBeNull();
    expect(card.querySelector("[data-icon='calendarAlert']")).not.toBeNull();
    expect(
      card.querySelector("[data-band] [data-icon='star']") as SVGElement,
    ).toHaveStyle({ color: "var(--blue)" });
  });

  it("EDIT-14 restores the overdue filter from the URL", async () => {
    stubDatasets(() => json(sample));
    renderAt("/orgs/demo/catalogue?overdue=true");
    expect(await screen.findByText("Cancer Cohort")).toBeVisible();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: text.overdueFilter }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("shows the no-match state and clears it", async () => {
    stubDatasets(() => json(sample));
    renderAt("/orgs/demo/catalogue?q=zzz");
    expect(await screen.findByText(text.noMatch.title("zzz"))).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("\u201czzz\u201d");
    await userEvent.click(
      screen.getByRole("button", { name: text.noMatch.clear }),
    );
    expect(await screen.findAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.getByRole("searchbox")).toHaveFocus();
  });

  it("puts focus back on the opened card when coming back", async () => {
    stubDatasets(() => json(sample));
    const router = renderAt("/orgs/demo/catalogue");
    await userEvent.click(
      await screen.findByRole("link", { name: /Cancer Cohort/ }),
    );
    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/orgs/demo/datasets/d2"),
    );
    router.history.back();
    const card = await screen.findByRole("link", { name: /Cancer Cohort/ });
    await waitFor(() => expect(card).toHaveFocus());
  });

  it("names the chosen access level when nothing matches", async () => {
    stubDatasets(() => json(sample));
    renderAt("/orgs/demo/catalogue?q=zzz&access=public");
    expect(
      await screen.findByText("No public datasets match \u201czzz\u201d"),
    ).toBeVisible();
    expect(screen.getByText(text.noMatch.description)).toBeVisible();
  });

  it("gives each card the star colour of its dataset and shows the reminder date", async () => {
    stubDatasets(() =>
      json([
        sample[0],
        { ...sample[1], reminder_date: "2027-03-04", overdue: false },
        sample[2],
      ]),
    );
    renderAt("/orgs/demo/catalogue");
    const card = await screen.findByRole("link", { name: /Cancer Cohort/ });
    expect(card).toHaveTextContent(`${text.reminderDue} 4 March 2027`);
    expect(card.querySelector("[data-icon='star']") as SVGElement).toHaveStyle({
      color: datasetStarColour("d2"),
    });
  });

  it("shows the empty state without search or filters", async () => {
    stubDatasets(() => json([]));
    renderAt("/orgs/demo/catalogue");
    expect(await screen.findByText(text.empty.title)).toBeVisible();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "All" }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: text.addDataset })).toHaveLength(
      1,
    );
  });

  it("shows a loading message, then an error with Retry", async () => {
    let calls = 0;
    stubDatasets(() => (++calls === 1 ? json({}, 500) : json(sample)));
    renderAt("/orgs/demo/catalogue");
    expect(await screen.findByText(text.loading)).toBeVisible();
    expect(await screen.findByText(text.error)).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: text.retry }));
    expect(await screen.findByText("Diabetes Registry")).toBeVisible();
  });
});
