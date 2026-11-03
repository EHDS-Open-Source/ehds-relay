import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  addYears,
  formatIsoDate,
  nextDay,
  todayIso,
} from "../datasets/reminderDates";
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
const form = shellMessages.datasetForm;
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
      form.sections.main,
      form.sections.access,
      form.sections.coverage,
      form.sections.organisations,
      form.sections.quantum,
    ]);
    expect(screen.queryByText(form.fields.provenance)).not.toBeInTheDocument();
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
    const link = screen.getByRole("link", { name: form.fields.provenance });
    expect(link).toHaveAttribute("href", `${path}/edit#field-provenance`);
    expect(
      screen.getByRole("link", {
        name: `${form.fields.publisher}: ${form.contactPointOf}`,
      }),
    ).toHaveAttribute("href", `${path}/edit#field-publisher-contact_point`);
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

describe("revalidation reminder", () => {
  const r = m.reminder;
  const reminderPath = `${base}/revalidation-reminder`;
  const inAYear = addYears(todayIso(), 1);

  /** The PUT handler echoes the date back as the server would. */
  function stubReminder(dataset = makeDataset(), status = 200) {
    const bodies: unknown[] = [];
    const calls = stubApi({
      [`GET ${base}`]: () => json(dataset),
      [`PUT ${reminderPath}`]: async (request) => {
        const body = (await request.json()) as { reminder_date: string | null };
        bodies.push(body);
        if (status !== 200) return json({ detail: "raw server text" }, status);
        return json({
          ...dataset,
          reminder_date: body.reminder_date,
          reminder_set_by_name: body.reminder_date ? "Ada Member" : null,
        });
      },
    });
    return { calls, bodies };
  }

  async function openDialog() {
    await userEvent.click(
      await screen.findByRole("button", { name: r.button }),
    );
    return screen.getByRole("alertdialog");
  }

  it("ADD-12 puts Set reminder between Catalogue and Edit", async () => {
    stubReminder();
    renderApp(path);
    await screen.findByRole("heading", { level: 1 });
    const actions = [
      screen.getByRole("link", { name: m.backToCatalogue }),
      screen.getByRole("button", { name: r.button }),
      screen.getByRole("link", { name: m.edit }),
    ];
    const order = (a: Element, b: Element) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING;
    expect(order(actions[0]!, actions[1]!)).toBeTruthy();
    expect(order(actions[1]!, actions[2]!)).toBeTruthy();
    expect(screen.getByText(r.none)).toBeVisible();
  });

  it("ADD-12 pre-fills a year ahead, saves it and shows it on the record", async () => {
    const { bodies } = stubReminder();
    renderApp(path);
    const dialog = await openDialog();
    const input = within(dialog).getByLabelText(r.dateLabel);
    expect(input).toHaveValue(inAYear);
    expect(input).toHaveAttribute("min", nextDay(todayIso()));
    // Nothing to remove yet
    expect(
      within(dialog).queryByRole("button", { name: r.clear }),
    ).not.toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: r.save }));
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(bodies).toEqual([{ reminder_date: inAYear }]);
    expect(screen.getByText(formatIsoDate(inAYear))).toBeVisible();
    expect(screen.getByText(/set by Ada Member/)).toBeVisible();
  });

  it("EDIT-11 changes an existing date", async () => {
    const current = addYears(todayIso(), 2);
    const { bodies } = stubReminder(
      makeDataset({ reminder_date: current, reminder_set_by_name: "Bo" }),
    );
    renderApp(path);
    expect(await screen.findByText(formatIsoDate(current))).toBeVisible();
    const dialog = await openDialog();
    const input = within(dialog).getByLabelText(r.dateLabel);
    expect(input).toHaveValue(current);
    const next = nextDay(todayIso());
    fireEvent.change(input, { target: { value: next } });
    await userEvent.click(within(dialog).getByRole("button", { name: r.save }));
    await waitFor(() => expect(bodies).toEqual([{ reminder_date: next }]));
    expect(await screen.findByText(formatIsoDate(next))).toBeVisible();
  });

  it("ADD-12 removes the reminder", async () => {
    const { bodies } = stubReminder(
      makeDataset({ reminder_date: inAYear, reminder_set_by_name: "Bo" }),
    );
    renderApp(path);
    const dialog = await openDialog();
    await userEvent.click(
      within(dialog).getByRole("button", { name: r.clear }),
    );
    await waitFor(() => expect(bodies).toEqual([{ reminder_date: null }]));
    expect(await screen.findByText(r.none)).toBeVisible();
  });

  it("EDIT-11 refuses today and past dates without calling the API", async () => {
    const { bodies } = stubReminder();
    renderApp(path);
    const dialog = await openDialog();
    const input = within(dialog).getByLabelText(r.dateLabel);
    fireEvent.change(input, { target: { value: todayIso() } });
    expect(within(dialog).getByText(r.problems.notFuture)).toBeVisible();
    expect(input).toHaveAttribute("aria-invalid", "true");
    await userEvent.click(within(dialog).getByRole("button", { name: r.save }));
    expect(screen.getByRole("alertdialog")).toBeVisible();

    fireEvent.change(input, { target: { value: "" } });
    expect(within(dialog).getByText(r.problems.required)).toBeVisible();
    fireEvent.change(input, { target: { value: addYears(todayIso(), 6) } });
    expect(within(dialog).getByText(r.problems.tooFar)).toBeVisible();
    expect(bodies).toEqual([]);
  });

  it("EDIT-11 shows a readable message when the server refuses", async () => {
    stubReminder(makeDataset(), 422);
    renderApp(path);
    const dialog = await openDialog();
    await userEvent.click(within(dialog).getByRole("button", { name: r.save }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      r.errors.invalid,
    );
    expect(screen.queryByText("raw server text")).not.toBeInTheDocument();
  });

  it("says when the reminder date has passed and offers a fresh date", async () => {
    stubReminder(makeDataset({ reminder_date: "2025-01-10" }));
    renderApp(path);
    expect(await screen.findByText(new RegExp(r.passed))).toHaveTextContent(
      formatIsoDate("2025-01-10"),
    );
    const dialog = await openDialog();
    expect(within(dialog).getByLabelText(r.dateLabel)).toHaveValue(inAYear);
  });
});

describe("overdue", () => {
  it("EDIT-14 shows the Overdue label on an overdue record", async () => {
    stubApi({
      [`GET ${base}`]: () =>
        json(
          makeDataset({
            overdue: true,
            published_at: "2024-01-15T10:00:00Z",
            last_validated_at: "2024-01-15T10:00:00Z",
          }),
        ),
    });
    renderApp(path);
    expect(await screen.findByText(m.overdue)).toBeVisible();
    expect(screen.getByText(m.overdueHint, { selector: "p" })).toBeVisible();
    expect(screen.getByText(m.lastValidated)).toBeVisible();
    expect(screen.getByText("15 Jan 2024, 10:00")).toBeVisible();
  });

  it("EDIT-14 shows no label when the record is not overdue", async () => {
    stubApi({ [`GET ${base}`]: () => json(makeDataset()) });
    renderApp(path);
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByText(m.overdue)).not.toBeInTheDocument();
  });
});
