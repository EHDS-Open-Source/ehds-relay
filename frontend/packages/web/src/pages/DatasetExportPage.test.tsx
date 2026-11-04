import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { shellMessages } from "../shell/messages";
import {
  ID,
  ORG,
  base,
  json,
  makeDataset,
  findAlert,
  renderApp,
  stubApi,
} from "./datasetTestUtils";

const m = shellMessages.datasets;
const path = `/orgs/${ORG}/datasets/${ID}/export`;

afterEach(() => {
  vi.restoreAllMocks();
});

const exportCalls = (calls: Request[]) =>
  calls.filter((c) => c.url.includes("/export"));

describe("dataset export", () => {
  it("shows the missing list instead of the output, and asks for nothing", async () => {
    const calls = stubApi({
      [`GET ${base}`]: () =>
        json(
          makeDataset({ status: "draft", missing_for_publish: ["provenance"] }),
        ),
    });
    renderApp(path);
    expect(await screen.findByText(m.output.incomplete)).toBeVisible();
    expect(
      screen.getByRole("link", {
        name: shellMessages.datasetForm.fields.provenance,
      }),
    ).toBeVisible();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(exportCalls(calls)).toHaveLength(0);
  });

  it("says the output is not available yet on every tab (501)", async () => {
    stubApi({
      [`GET ${base}`]: () => json(makeDataset()),
      [`GET ${base}/export`]: () => json({ detail: "not implemented" }, 501),
    });
    renderApp(path);
    for (const name of ["Turtle (TTL)", "JSON-LD", "RDF/XML"]) {
      await userEvent.click(await screen.findByRole("tab", { name }));
      expect(await screen.findByText(m.output.unavailable)).toBeVisible();
    }
  });

  it("keeps the tab in the URL and asks for that format", async () => {
    const calls = stubApi({
      [`GET ${base}`]: () => json(makeDataset()),
      [`GET ${base}/export`]: () => new Response("<rdf/>", { status: 200 }),
    });
    const router = renderApp(`${path}?format=rdfxml`);
    expect(await screen.findByText("<rdf/>")).toBeVisible();
    expect(new URL(exportCalls(calls)[0]!.url).searchParams.get("format")).toBe(
      "rdfxml",
    );
    await userEvent.click(screen.getByRole("tab", { name: "JSON-LD" }));
    await waitFor(() => {
      expect(router.state.location.search).toEqual({ format: "jsonld" });
    });
  });

  it("copies and downloads with the dataset's file name and media type", async () => {
    stubApi({
      [`GET ${base}`]: () => json(makeDataset()),
      [`GET ${base}/export`]: () =>
        new Response("@prefix a: <b> .", { status: 200 }),
    });
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    const create = vi.fn(() => "blob:x");
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() });
    let name = "";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      name = this.download;
    });

    renderApp(path);
    expect(await screen.findByText("@prefix a: <b> .")).toBeVisible();
    // The panel names the format by its media type.
    expect(screen.getByText("text/turtle")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith("@prefix a: <b> .");

    await userEvent.click(
      screen.getByRole("button", { name: "Download .ttl" }),
    );
    expect(name).toBe("hospital-admissions.ttl");
    const blob = (create.mock.calls as unknown as [Blob][])[0]![0];
    expect(blob.type).toBe("text/turtle");
  });

  it("goes back to the record", async () => {
    stubApi({
      [`GET ${base}`]: () => json(makeDataset()),
      [`GET ${base}/export`]: () => json({}, 501),
    });
    renderApp(path);
    expect(
      await screen.findByRole("link", { name: m.backToRecord }),
    ).toHaveAttribute("href", `/orgs/${ORG}/datasets/${ID}`);
  });

  describe("official checks", () => {
    const v = m.validation;
    const exportOk = () => new Response("@prefix a: <b> .", { status: 200 });

    it("says the record passes", async () => {
      const calls = stubApi({
        [`GET ${base}`]: () => json(makeDataset()),
        [`GET ${base}/export`]: exportOk,
        [`POST ${base}/validate`]: () =>
          json({ conforms: true, missing: [], violations: [] }),
      });
      renderApp(path);
      expect(await screen.findByText(v.passes)).toBeVisible();
      expect(
        calls.filter((c) => c.method === "POST" && c.url.endsWith("/validate")),
      ).toHaveLength(1);
    });

    it("lists problems in plain words, linked to their form fields", async () => {
      stubApi({
        [`GET ${base}`]: () => json(makeDataset()),
        [`GET ${base}/export`]: exportOk,
        [`POST ${base}/validate`]: () =>
          json({
            conforms: false,
            missing: [],
            violations: [
              {
                path: "dcatap:applicableLegislation",
                field: "distributions",
                message:
                  "In a distribution: the applicable legislation is missing.",
                severity: "violation",
              },
              {
                path: null,
                field: null,
                message: "Something about the whole record.",
                severity: "violation",
              },
            ],
          }),
      });
      renderApp(path);
      const alert = await findAlert();
      expect(alert).toHaveTextContent(v.fails);
      const link = screen.getByRole("link", {
        name: shellMessages.datasetForm.fields.distributions,
      });
      expect(link).toHaveAttribute(
        "href",
        `/orgs/${ORG}/datasets/${ID}/edit#field-distributions`,
      );
      expect(
        screen.getByText(
          "In a distribution: the applicable legislation is missing.",
        ),
      ).toBeVisible();
      expect(screen.getByText(v.wholeRecord)).toBeVisible();
      expect(
        screen.getByText("Something about the whole record."),
      ).toBeVisible();
      // The output is still shown alongside
      expect(await screen.findByText("@prefix a: <b> .")).toBeVisible();
    });

    it("says the checks are not available yet (501) and still shows the output", async () => {
      stubApi({
        [`GET ${base}`]: () => json(makeDataset()),
        [`GET ${base}/export`]: exportOk,
        [`POST ${base}/validate`]: () =>
          json({ detail: "Not implemented yet" }, 501),
      });
      renderApp(path);
      expect(await screen.findByText(v.unavailable)).toBeVisible();
      expect(await screen.findByText("@prefix a: <b> .")).toBeVisible();
    });

    it("is not run for an incomplete record", async () => {
      const calls = stubApi({
        [`GET ${base}`]: () =>
          json(makeDataset({ missing_for_publish: ["keyword"] })),
      });
      renderApp(path);
      expect(await screen.findByText(m.output.incomplete)).toBeVisible();
      expect(calls.filter((c) => c.url.endsWith("/validate"))).toHaveLength(0);
    });
  });
});
