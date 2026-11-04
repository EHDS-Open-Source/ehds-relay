import { CSRF_HEADER, CSRF_HEADER_VALUE } from "@ehds-relay/api-client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createRelayRouter } from "../router/router";
import { createTestSessionStore, demoSession } from "../session/testing";
import { shellMessages } from "../shell/messages";
import { createFakeServer } from "./fakeServer";
import { fieldAnchorId, fieldKeys, fieldLabel } from "./fields";
import { goldenExamples } from "./goldenExamples";

const text = shellMessages.datasetForm;
const org = demoSession.orgs[0]!.id;

let server: ReturnType<typeof createFakeServer>;

beforeEach(() => {
  server = createFakeServer();
  vi.stubGlobal("fetch", vi.fn(server.fetch));
});

function renderAt(path: string) {
  const router = createRelayRouter({
    queryClient: new QueryClient({
      defaultOptions: { queries: { retry: false } },
    }),
    session: createTestSessionStore(demoSession),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  render(
    <QueryClientProvider client={router.options.context.queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

async function openNew() {
  const router = renderAt(`/orgs/${org}/datasets/new`);
  await screen.findByRole("heading", {
    level: 1,
    name: shellMessages.pages.datasetNew.title,
  });
  return router;
}

async function openEdit(id: string, search = "") {
  const router = renderAt(`/orgs/${org}/datasets/${id}/edit${search}`);
  await screen.findByRole("form", { name: text.formLabel });
  return router;
}

async function choose(action: string) {
  // Just after a save the button reads "Saved" for a moment
  await userEvent.click(
    screen.getByRole("button", {
      name: new RegExp(`^(${text.actions.saveMenu}|${text.actions.saved})$`),
    }),
  );
  await userEvent.click(await screen.findByRole("menuitem", { name: action }));
}

function field(key: string) {
  const el = document.getElementById(fieldAnchorId(key));
  if (!el) throw new Error(`no field ${key}`);
  return within(el);
}

const titleBox = () => field("title").getByLabelText(text.fields.title);

describe("new dataset form", () => {
  it("shows the six sections, a section menu and every field", async () => {
    await openNew();
    const nav = screen.getByRole("navigation", { name: text.sectionNavLabel });
    for (const title of Object.values(text.sections)) {
      expect(
        screen.getByRole("heading", { level: 2, name: title }),
      ).toBeVisible();
      expect(within(nav).getByRole("link", { name: title })).toBeVisible();
    }
    // Variables appear once the data is structured
    for (const key of fieldKeys.filter((k) => k !== "variables")) {
      expect(document.getElementById(fieldAnchorId(key))).toBeInTheDocument();
    }
    expect(screen.queryByText(/data theme/i)).not.toBeInTheDocument();

    await userEvent.click(
      within(nav).getByRole("link", { name: text.sections.coverage }),
    );
    expect(document.getElementById("section-coverage")).toHaveFocus();
  });

  it("saves a draft with only a title and continues on the edit page", async () => {
    const router = await openNew();
    await userEvent.type(titleBox(), "Bed occupancy");
    await choose(text.actions.saveDraft);

    await waitFor(() =>
      expect(router.state.location.pathname).toMatch(
        /\/datasets\/[^/]+\/edit$/,
      ),
    );
    const [request] = server.saves();
    expect(request?.method).toBe("POST");
    expect(request?.path).toBe(`/api/v1/organisations/${org}/datasets`);
    expect(request?.headers.get(CSRF_HEADER)).toBe(CSRF_HEADER_VALUE);
    expect(request?.body).toEqual({
      metadata: { title: [{ lang: "en", text: "Bed occupancy" }] },
      publish: false,
    });
    expect(router.state.location.search).toEqual({ saved: "draft" });
    expect(await screen.findByText(text.status.savedDraft)).toBeVisible();
    expect(titleBox()).toHaveValue("Bed occupancy");
  });

  it("refuses to save without a title and sends nothing", async () => {
    await openNew();
    await userEvent.type(
      field("provenance").getByRole("textbox"),
      "From records",
    );
    await choose(text.actions.saveDraft);
    // The form's status line says it, and so does the title field
    const status = await screen.findByText(text.status.titleRequired, {
      selector: "[role=status] *",
    });
    expect(status).toBeVisible();
    await waitFor(() => expect(titleBox()).toHaveFocus());
    expect(server.saves()).toHaveLength(0);
  });

  it("saves an incomplete dataset as a draft and lists what is missing", async () => {
    const router = await openNew();
    await userEvent.type(titleBox(), "Partial");
    await choose(text.actions.saveAndPublish);

    const panel = await screen.findByRole("region", {
      name: text.missing.title,
    });
    expect(server.saves()[0]?.body).toMatchObject({ publish: true });
    expect(router.state.location.search).toEqual({ saved: "incomplete" });
    const items = within(panel)
      .getAllByRole("button")
      .map((b) => b.textContent);
    expect(items).toContain(fieldLabel("keyword"));
    expect(items).toContain(fieldLabel("health_data_access_body"));
    expect(items).not.toContain(fieldLabel("title"));

    await userEvent.click(
      within(panel).getByRole("button", { name: fieldLabel("keyword") }),
    );
    expect(field("keyword").getByRole("textbox")).toHaveFocus();
  });

  it("shows variables only for structured data and sends them only then", async () => {
    await openNew();
    await userEvent.type(titleBox(), "Structured");
    const structured = field("structured_data");
    expect(
      document.getElementById(fieldAnchorId("variables")),
    ).not.toBeInTheDocument();

    await userEvent.click(structured.getByLabelText(text.yes));
    const variables = field("variables");
    await userEvent.type(variables.getByLabelText(text.variable.name), "age");
    await userEvent.type(
      variables.getByLabelText(text.variable.dataType),
      "integer",
    );
    await userEvent.type(
      variables.getByLabelText(text.variable.definition),
      "Age in years",
    );
    await userEvent.click(
      variables.getByRole("button", { name: text.addVariable }),
    );
    expect(variables.getAllByLabelText(text.variable.name)).toHaveLength(2);
    await userEvent.click(
      variables.getByRole("button", {
        name: `${text.remove} ${text.variable.item} 2`,
      }),
    );
    expect(variables.getAllByLabelText(text.variable.name)).toHaveLength(1);

    await userEvent.click(structured.getByLabelText(text.no));
    expect(
      document.getElementById(fieldAnchorId("variables")),
    ).not.toBeInTheDocument();
    await choose(text.actions.saveDraft);
    await waitFor(() => expect(server.saves()).toHaveLength(1));
    const body = server.saves()[0]!.body as {
      metadata: Record<string, unknown>;
    };
    expect(body.metadata.structured_data).toBe(false);
    expect(body.metadata).not.toHaveProperty("variables");
  });

  it("adds tags with Enter, name and web address pairs, languages and contact points", async () => {
    await openNew();
    await userEvent.type(titleBox(), "Lists");

    // A second title language
    await userEvent.click(
      field("title").getByRole("button", { name: text.addLanguage }),
    );
    const langs = field("title").getAllByLabelText(text.langText.lang);
    await userEvent.type(langs[1]!, "fr");
    await userEvent.type(
      field("title").getByLabelText(`${text.fields.title} 2`),
      "Listes",
    );

    const keywords = field("keyword").getByRole("textbox");
    await userEvent.type(keywords, "oncology{Enter}registry{Enter}");
    await userEvent.click(
      field("keyword").getByRole("button", { name: "Remove keyword registry" }),
    );
    await userEvent.type(
      field("identifier").getByRole("textbox"),
      "ID-1{Enter}",
    );
    await userEvent.type(
      field("code_values").getByRole("textbox"),
      "U07.1{Enter}",
    );

    const themes = field("health_theme");
    await userEvent.click(themes.getByRole("button", { name: text.addTerm }));
    const labels = themes.getAllByLabelText(text.term.label);
    const uris = themes.getAllByLabelText(text.term.uri);
    await userEvent.type(labels[0]!, "Health systems");
    await userEvent.type(uris[0]!, "https://example.org/hs");
    await userEvent.type(labels[1]!, "Removed");
    await userEvent.click(
      themes.getByRole("button", {
        name: `${text.remove} ${text.fields.health_theme} 2`,
      }),
    );

    const contacts = field("contact_points");
    await userEvent.type(
      contacts.getByLabelText(text.contactPoint.name),
      "Desk",
    );
    await userEvent.type(
      contacts.getByLabelText(text.contactPoint.email),
      "desk@example.org",
    );
    await userEvent.click(
      contacts.getByRole("button", { name: text.addContactPoint }),
    );
    expect(contacts.getAllByLabelText(text.contactPoint.name)).toHaveLength(2);

    const distributions = field("distributions");
    await userEvent.click(
      distributions.getByRole("button", { name: text.addDistribution }),
    );
    await userEvent.click(
      distributions.getByRole("button", {
        name: `${text.remove} ${text.distribution.item} 2`,
      }),
    );
    await userEvent.type(
      distributions.getByLabelText(text.distribution.accessUrl),
      "https://example.org/get",
    );
    const legislation = within(
      distributions.getByRole("group", { name: text.distribution.legislation }),
    );
    await userEvent.type(legislation.getByLabelText(text.term.label), "DGA");
    await userEvent.type(
      legislation.getByLabelText(text.term.uri),
      "http://data.europa.eu/eli/reg/2022/868/oj",
    );

    await choose(text.actions.saveDraft);
    await waitFor(() => expect(server.saves()).toHaveLength(1));
    expect((server.saves()[0]!.body as { metadata: unknown }).metadata).toEqual(
      {
        title: [
          { lang: "en", text: "Lists" },
          { lang: "fr", text: "Listes" },
        ],
        keyword: ["oncology"],
        identifier: ["ID-1"],
        code_values: ["U07.1"],
        health_theme: [
          { label: "Health systems", uri: "https://example.org/hs" },
        ],
        contact_points: [{ name: "Desk", email: "desk@example.org" }],
        distributions: [
          {
            access_url: "https://example.org/get",
            applicable_legislation: [
              {
                label: "DGA",
                uri: "http://data.europa.eu/eli/reg/2022/868/oj",
              },
            ],
          },
        ],
      },
    );
  });

  it("points at a half-filled entry instead of saving it", async () => {
    await openNew();
    await userEvent.type(titleBox(), "Half");
    await userEvent.type(
      field("health_theme").getByLabelText(text.term.label),
      "No address",
    );
    await choose(text.actions.saveDraft);
    expect(await screen.findByText(text.errors.url)).toBeVisible();
    expect(field("health_theme").getByLabelText(text.term.uri)).toHaveFocus();
    expect(server.saves()).toHaveLength(0);
  });

  it("marks the fields a dataset needs to be published as required", async () => {
    await openNew();
    for (const key of ["title", "keyword", "access_rights", "publisher"]) {
      expect(field(key).getAllByText("(required)")[0]).toBeInTheDocument();
    }
    // Needed only with personal data, or not needed at all
    expect(
      document.querySelector(
        `#${fieldAnchorId("number_of_unique_individuals")} [data-slot="required-star"]`,
      ),
    ).toBeNull();
    expect(
      document.querySelector(
        `#${fieldAnchorId("code_values")} [data-slot="required-star"]`,
      ),
    ).toBeNull();
    await userEvent.click(field("has_personal_data").getByLabelText(text.yes));
    expect(
      document.querySelector(
        `#${fieldAnchorId("number_of_unique_individuals")} [data-slot="required-star"]`,
      ),
    ).not.toBeNull();
  });

  it("clears an empty form without asking", async () => {
    await openNew();
    await userEvent.click(
      screen.getByRole("button", { name: text.actions.clear }),
    );
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("keeps the entries when the clear confirmation is declined", async () => {
    await openNew();
    await userEvent.type(titleBox(), "Stay");
    await userEvent.click(
      screen.getByRole("button", { name: text.actions.clear }),
    );
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(text.actions.clearTitle)).toBeVisible();
    await userEvent.click(
      within(dialog).getByRole("button", { name: text.actions.cancel }),
    );
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(titleBox()).toHaveValue("Stay");
  });

  it("clears the form after confirming", async () => {
    await openNew();
    await userEvent.type(titleBox(), "Gone soon");
    await userEvent.click(
      screen.getByRole("button", { name: text.actions.clear }),
    );
    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: text.actions.clearConfirm }),
    );
    expect(titleBox()).toHaveValue("");
  });
});

describe("editing a dataset", () => {
  it("pre-fills every saved value and publishes a complete dataset", async () => {
    const full = goldenExamples.non_public_full;
    const dataset = server.seed(org, full, "draft");
    const router = await openEdit(dataset.id);

    expect(titleBox()).toHaveValue(full.title![0]!.text);
    expect(field("keyword").getByText("oncology")).toBeVisible();
    expect(field("structured_data").getByLabelText(text.yes)).toBeChecked();
    expect(
      field("variables").getAllByLabelText(text.variable.name)[1],
    ).toHaveValue("primaryDiagnosisCode");
    expect(
      screen.getByLabelText(new RegExp(text.accessRights.non_public.label)),
    ).toBeChecked();
    expect(
      field("publisher").getByLabelText(text.organisation.description),
    ).toHaveValue(full.publisher!.description);
    expect(field("number_of_records").getByRole("spinbutton")).toHaveValue(
      1850000,
    );
    expect(
      field("temporal_coverage").getByLabelText(text.temporal.end),
    ).toHaveValue("2024-12-31");

    await choose(text.actions.saveAndPublish);
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        `/orgs/${org}/datasets/${dataset.id}`,
      ),
    );
    const [request] = server.saves();
    expect(request?.method).toBe("PUT");
    expect(request?.body).toEqual({
      metadata: full,
      publish: true,
      version: 1,
    });
    expect(server.datasets.get(dataset.id)?.status).toBe("published");
  });

  it("returns a published dataset to draft with Save draft", async () => {
    const dataset = server.seed(
      org,
      goldenExamples.non_public_full,
      "published",
    );
    expect(dataset.status).toBe("published");
    await openEdit(dataset.id);
    await choose(text.actions.saveDraft);
    expect(await screen.findByText(text.status.savedDraft)).toBeVisible();
    // The save button confirms in the success colours for a moment
    expect(
      screen.getByRole("button", { name: text.actions.saved }),
    ).toHaveAttribute("data-saved", "true");
    expect(server.saves()[0]?.body).toMatchObject({
      publish: false,
      version: 1,
    });
    expect(server.datasets.get(dataset.id)?.status).toBe("draft");

    // The next save uses the new version
    await choose(text.actions.saveDraft);
    await waitFor(() => expect(server.saves()).toHaveLength(2));
    expect(server.saves()[1]?.body).toMatchObject({ version: 2 });
  });

  it("shows the missing list on arrival after an incomplete first save", async () => {
    const dataset = server.seed(
      org,
      { title: [{ lang: "en", text: "T" }] },
      "draft",
    );
    await openEdit(dataset.id, "?saved=incomplete");
    const panel = screen.getByRole("region", { name: text.missing.title });
    expect(
      within(panel).getByRole("button", { name: fieldLabel("publisher") }),
    ).toBeVisible();
  });

  it("says when someone else changed the dataset", async () => {
    const dataset = server.seed(
      org,
      { title: [{ lang: "en", text: "T" }] },
      "draft",
    );
    await openEdit(dataset.id);
    server.respondOnce(409, { detail: "stale version" });
    await choose(text.actions.saveDraft);
    expect(await screen.findByText(text.status.conflict)).toBeVisible();
  });

  it("shows a server error next to its field", async () => {
    const dataset = server.seed(
      org,
      { title: [{ lang: "en", text: "T" }] },
      "draft",
    );
    await openEdit(dataset.id);
    await userEvent.type(
      field("quantum_label").getByRole("textbox"),
      "not turtle",
    );
    server.respondOnce(422, {
      detail: [
        {
          loc: ["body", "metadata", "quantum_label"],
          msg: "not valid Turtle",
          type: "value_error",
        },
      ],
    });
    await choose(text.actions.saveDraft);
    expect(await screen.findByText(text.status.fixErrors)).toBeVisible();
    expect(
      field("quantum_label").getByRole("textbox"),
    ).toHaveAccessibleDescription(expect.stringContaining(text.invalid));
  });
});
