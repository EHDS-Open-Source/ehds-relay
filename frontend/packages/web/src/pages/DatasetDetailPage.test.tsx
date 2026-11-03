import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { shellMessages } from "../shell/messages";
import {
  ID,
  ORG,
  base,
  json,
  makeDataset,
  renderApp,
  standardSession,
  stubApi,
} from "./datasetTestUtils";

const m = shellMessages.datasets;
const path = `/orgs/${ORG}/datasets/${ID}`;

describe("dataset detail", () => {
  it("shows the header facts and only filled-in fields in section order", async () => {
    stubApi({ [`GET ${base}`]: () => json(makeDataset()) });
    renderApp(path);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Hospital Admissions",
      }),
    ).toBeVisible();
    expect(screen.getByText("All admissions", { selector: "p" })).toBeVisible();
    expect(screen.getByText("Published")).toBeVisible();
    expect(screen.getAllByText("Restricted").length).toBeGreaterThan(0);
    expect(screen.getByText("3 Feb 2026, 10:00")).toBeVisible();

    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent);
    expect(headings).toEqual([
      m.sections.main,
      m.sections.access,
      m.sections.coverage,
      m.sections.organisations,
      m.sections.quantum,
    ]);
    expect(screen.queryByText(m.fields.provenance)).not.toBeInTheDocument();
    expect(screen.getByText("Acme Hospital")).toBeVisible();
    expect(screen.getByText("1,200")).toBeVisible();
    expect(screen.getByRole("link", { name: "Cardiology" })).toHaveAttribute(
      "href",
      "https://example.org/Cardiology",
    );
    expect(screen.queryByText(m.draft.title)).not.toBeInTheDocument();
  });

  it("shows how to publish a draft with links to the missing fields", async () => {
    stubApi({
      [`GET ${base}`]: () =>
        json(
          makeDataset({
            status: "draft",
            missing_for_publish: ["provenance", "publisher.contact_point"],
          }),
        ),
    });
    renderApp(path);

    expect(await screen.findByText(m.draft.title)).toBeVisible();
    expect(screen.getByText(m.draft.howToPublish)).toBeVisible();
    const link = screen.getByRole("link", { name: m.fields.provenance });
    expect(link).toHaveAttribute("href", `${path}/edit#field-provenance`);
    expect(
      screen.getByRole("link", {
        name: `${m.fields.publisher} (${m.contactPointPart})`,
      }),
    ).toHaveAttribute("href", `${path}/edit#field-publisher`);
  });

  it("says when the dataset does not exist", async () => {
    stubApi({ [`GET ${base}`]: () => json({ detail: "no" }, 404) });
    renderApp(path);
    expect(await screen.findByText(m.notFound.title)).toBeVisible();
    expect(screen.getByRole("link", { name: m.backToCatalogue })).toBeVisible();
  });

  it("has Edit, View output and Back to catalogue links", async () => {
    stubApi({ [`GET ${base}`]: () => json(makeDataset()) });
    renderApp(path);
    await screen.findByRole("heading", { level: 1 });
    expect(screen.getByRole("link", { name: m.edit })).toHaveAttribute(
      "href",
      `${path}/edit`,
    );
    expect(screen.getByRole("link", { name: m.viewOutput })).toHaveAttribute(
      "href",
      `${path}/export`,
    );
  });
});

describe("delete", () => {
  it("asks first, then deletes and goes to the catalogue", async () => {
    const calls = stubApi({
      [`GET ${base}`]: () => json(makeDataset()),
      [`DELETE ${base}`]: () => new Response(null, { status: 204 }),
    });
    const router = renderApp(path);
    await userEvent.click(
      await screen.findByRole("button", { name: m.delete }),
    );
    const dialog = screen.getByRole("alertdialog");
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
    await userEvent.click(
      within(dialog).getByRole("button", { name: m.deleteDialog.confirm }),
    );
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/orgs/${ORG}/catalogue`);
    });
    expect(calls.filter((c) => c.method === "DELETE")).toHaveLength(1);
  });

  it("can be cancelled", async () => {
    const calls = stubApi({ [`GET ${base}`]: () => json(makeDataset()) });
    renderApp(path);
    await userEvent.click(
      await screen.findByRole("button", { name: m.delete }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
  });

  it("is not offered to a standard member", async () => {
    stubApi({ [`GET ${base}`]: () => json(makeDataset()) });
    renderApp(path, standardSession);
    await screen.findByRole("heading", { level: 1 });
    expect(
      screen.queryByRole("button", { name: m.delete }),
    ).not.toBeInTheDocument();
  });

  it("shows a readable message on 403 and stays on the page", async () => {
    stubApi({
      [`GET ${base}`]: () => json(makeDataset()),
      [`DELETE ${base}`]: () => json({ detail: "no" }, 403),
    });
    const router = renderApp(path);
    await userEvent.click(
      await screen.findByRole("button", { name: m.delete }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: m.deleteDialog.confirm }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      m.deleteDialog.forbidden,
    );
    expect(router.state.location.pathname).toBe(path);
  });
});
