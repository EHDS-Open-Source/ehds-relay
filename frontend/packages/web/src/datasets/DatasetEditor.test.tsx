import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  ID,
  ORG,
  base,
  json,
  makeDataset,
  stubApi,
} from "../pages/datasetTestUtils";
import { shellMessages } from "../shell/messages";
import { DatasetEditor, type DatasetFormRenderProps } from "./DatasetEditor";

const m = shellMessages.datasets;

// A stand-in for the dataset form with the same contract: initial values in, a submit out.
function FakeForm({ initialValues, onSubmit }: DatasetFormRenderProps) {
  return (
    <div>
      <p>form: {initialValues.title?.[0]?.text}</p>
      <button
        onClick={() => {
          onSubmit({ metadata: initialValues, publish: false });
        }}
      >
        Save draft
      </button>
      <button
        onClick={() => {
          onSubmit({ metadata: initialValues, publish: true });
        }}
      >
        Save and Publish
      </button>
    </div>
  );
}

function renderEditor() {
  const root = createRootRoute({ component: Outlet });
  const detail = createRoute({
    getParentRoute: () => root,
    path: "/orgs/$orgId/datasets/$datasetId",
    component: () => <p>the record</p>,
  });
  const edit = createRoute({
    getParentRoute: () => root,
    path: "/orgs/$orgId/datasets/$datasetId/edit",
    component: () => (
      <DatasetEditor
        orgId={ORG}
        datasetId={ID}
        renderForm={(props) => <FakeForm {...props} />}
      />
    ),
  });
  const router = createRouter({
    routeTree: root.addChildren([detail, edit]),
    history: createMemoryHistory({
      initialEntries: [`/orgs/${ORG}/datasets/${ID}/edit`],
    }),
  });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

describe("DatasetEditor", () => {
  it("fills the form and saves with the version that was read", async () => {
    let body: unknown;
    stubApi({
      [`GET ${base}`]: () => json(makeDataset()),
      [`PUT ${base}`]: async (request) => {
        body = await request.json();
        return json(makeDataset({ version: 4 }));
      },
    });
    const router = renderEditor();
    expect(await screen.findByText("form: Hospital Admissions")).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: "Save and Publish" }),
    );
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(
        `/orgs/${ORG}/datasets/${ID}`,
      );
    });
    expect(body).toMatchObject({ publish: true, version: 3 });
    expect((body as { metadata: unknown }).metadata).toEqual(
      makeDataset().metadata,
    );
  });

  it("sends publish false for Save draft", async () => {
    let body: unknown;
    stubApi({
      [`GET ${base}`]: () => json(makeDataset()),
      [`PUT ${base}`]: async (request) => {
        body = await request.json();
        return json(makeDataset({ status: "draft", version: 4 }));
      },
    });
    renderEditor();
    await userEvent.click(
      await screen.findByRole("button", { name: "Save draft" }),
    );
    await waitFor(() => {
      expect(body).toMatchObject({ publish: false, version: 3 });
    });
  });

  it("refuses a stale save and reloads after confirmation", async () => {
    let reads = 0;
    stubApi({
      [`GET ${base}`]: () => {
        reads += 1;
        return json(
          reads === 1
            ? makeDataset()
            : makeDataset({ version: 5, title: "Changed elsewhere" }),
        );
      },
      [`PUT ${base}`]: () => json({ detail: "stale" }, 409),
    });
    const router = renderEditor();
    await userEvent.click(
      await screen.findByRole("button", { name: "Save draft" }),
    );
    expect(await screen.findByText(m.save.conflictTitle)).toBeVisible();
    expect(router.state.location.pathname).toMatch(/edit$/);

    await userEvent.click(screen.getByRole("button", { name: m.save.reload }));
    await userEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: m.save.reload,
      }),
    );
    await waitFor(() => {
      expect(screen.queryByText(m.save.conflictTitle)).not.toBeInTheDocument();
    });
    expect(reads).toBe(2);
  });

  it("shows a readable message for 403", async () => {
    stubApi({
      [`GET ${base}`]: () => json(makeDataset()),
      [`PUT ${base}`]: () => json({ detail: "no" }, 403),
    });
    renderEditor();
    await userEvent.click(
      await screen.findByRole("button", { name: "Save draft" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      m.save.forbidden,
    );
  });
});
