import { screen, waitFor, within } from "@testing-library/react";
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
  findAlert,
  renderApp,
  standardSession,
  stubApi,
} from "./datasetTestUtils";

const m = shellMessages.datasets;

/** e.g. "4 November 2027", as the reminder dialog and its toasts write dates. */
const longDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
const form = shellMessages.datasetForm;
const path = `/orgs/${ORG}/datasets/${ID}`;

describe("dataset detail", () => {
  it("shows the header facts and every field, grouped for reading", async () => {
    stubApi({ [`GET ${base}`]: () => json(makeDataset()) });
    renderApp(path);

    const title = await screen.findByRole("heading", {
      level: 1,
      name: "Hospital Admissions",
    });
    expect(title).toBeVisible();
    // The star stays on the line of the title's last word.
    const tail = title.querySelector("[data-slot=title-tail]");
    expect(tail).toHaveTextContent("Admissions");
    expect(tail?.querySelector("[data-icon=star]")).not.toBeNull();
    expect(screen.getByText("All admissions", { selector: "p" })).toBeVisible();

    // Pills: access level, then how much data, with the count in words.
    const pills = within(
      screen.getByRole("list", { name: m.record.factsLabel }),
    )
      .getAllByRole("listitem")
      .map((li) => li.textContent);
    expect(pills).toEqual([
      `${m.record.pillLabels.access} Restricted`,
      "1.2 thousand records",
    ]);
    // Status and dates sit on the quieter line, not in the pills.
    expect(screen.getByText(m.record.status.published)).toBeVisible();
    expect(
      screen.getByText(m.record.lastChanged("3 February 2026 at 10:00")),
    ).toBeVisible();

    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent);
    expect(headings).toEqual([
      m.record.sections.description,
      m.record.sections.access,
      m.record.sections.keyword,
      m.record.sections.quantum,
    ]);
    // Empty fields are listed with a dash.
    const provenance = document.getElementById("record-provenance")!;
    expect(provenance).toHaveTextContent(form.fields.provenance);
    expect(within(provenance).getByText("—")).toBeInTheDocument();
    expect(screen.getByText("Acme Hospital")).toBeVisible();
    expect(screen.getByText("1,200")).toBeVisible();
    expect(screen.getByRole("link", { name: "Cardiology" })).toHaveAttribute(
      "href",
      "https://example.org/Cardiology",
    );
    // Keywords are pills.
    expect(
      [...document.querySelectorAll("[data-slot=keyword]")].map(
        (k) => k.textContent,
      ),
    ).toEqual(["health", "admissions"]);
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
    expect(
      within(screen.getByRole("main")).getByRole("link", {
        name: m.backToCatalogue,
      }),
    ).toBeVisible();
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
    expect(await screen.findByText(m.deleteDialog.deleted)).toBeVisible();
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
    expect(await findAlert()).toHaveTextContent(m.deleteDialog.forbidden);
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

  /** The button that opens the calendar inside the reminder dialog. */
  const dateButton = (dialog: HTMLElement) =>
    within(dialog).getByRole("button", { name: new RegExp(r.dateLabel) });

  async function openDialog() {
    await userEvent.click(
      await screen.findByRole("button", {
        name: new RegExp(`^(${r.button}|${r.update})$`),
      }),
    );
    return screen.getByRole("alertdialog");
  }

  it("ADD-12 puts Set reminder before Edit beside the title", async () => {
    stubReminder();
    renderApp(path);
    await screen.findByRole("heading", { level: 1 });
    const set = screen.getByRole("button", { name: r.button });
    const edit = screen.getByRole("link", { name: m.edit });
    expect(
      set.compareDocumentPosition(edit) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(set.querySelector("[data-icon=calendar]")).not.toBeNull();
    // The icon comes after the label on both buttons.
    expect(set.lastElementChild?.querySelector("[data-icon]")).not.toBeNull();
    expect(edit.lastElementChild).toHaveAttribute("data-icon", "edit");
    expect(screen.queryByText(m.ribbon.due)).not.toBeInTheDocument();
  });

  it("ADD-12 pre-fills a year ahead, saves it and shows it on the record", async () => {
    const { bodies } = stubReminder();
    renderApp(path);
    const dialog = await openDialog();
    expect(dateButton(dialog)).toHaveTextContent(longDate(inAYear));
    // Nothing to remove yet
    expect(
      within(dialog).queryByRole("button", { name: r.clear }),
    ).not.toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: r.save }));
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(bodies).toEqual([{ reminder_date: inAYear }]);
    expect(
      await screen.findByText(r.savedToast(longDate(inAYear))),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: r.update })).toHaveFocus();
    // The ribbon shows the date
    expect(screen.getByText(m.ribbon.due).parentElement).toHaveTextContent(
      `${m.ribbon.due}${formatIsoDate(inAYear)}`,
    );
    expect(screen.getByText(/set by Ada Member/)).toBeVisible();
  });

  it("EDIT-11 changes an existing date", async () => {
    const current = addYears(todayIso(), 2);
    const { bodies } = stubReminder(
      makeDataset({ reminder_date: current, reminder_set_by_name: "Bo" }),
    );
    renderApp(path);
    expect(
      (await screen.findAllByText(formatIsoDate(current))).length,
    ).toBeGreaterThan(0);
    const dialog = await openDialog();
    expect(dateButton(dialog)).toHaveTextContent(longDate(current));
    // The calendar opens on the saved day; the next one is one key away
    await userEvent.click(dateButton(dialog));
    await userEvent.keyboard("{ArrowRight}{Enter}");
    const next = nextDay(current);
    expect(dateButton(dialog)).toHaveTextContent(longDate(next));
    await userEvent.click(within(dialog).getByRole("button", { name: r.save }));
    await waitFor(() => expect(bodies).toEqual([{ reminder_date: next }]));
    await waitFor(() =>
      expect(screen.getByText(m.ribbon.due).parentElement).toHaveTextContent(
        formatIsoDate(next),
      ),
    );
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
    // Asks first, naming the dataset and the date
    const confirm = screen.getByRole("alertdialog", {
      name: r.clearDialog.title(makeDataset().title!),
    });
    expect(confirm).toHaveTextContent(longDate(inAYear));
    expect(bodies).toEqual([]);
    await userEvent.click(
      within(confirm).getByRole("button", { name: r.clearDialog.confirm }),
    );
    await waitFor(() => expect(bodies).toEqual([{ reminder_date: null }]));
    await waitFor(() =>
      expect(screen.queryByText(m.ribbon.due)).not.toBeInTheDocument(),
    );
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(await screen.findByText(r.clearedToast)).toBeVisible();
    // Focus goes back to the button that opened the reminder dialog
    expect(screen.getByRole("button", { name: r.button })).toHaveFocus();
  });

  it("keeps the reminder when the clear confirmation is cancelled", async () => {
    const { bodies } = stubReminder(
      makeDataset({ reminder_date: inAYear, reminder_set_by_name: "Bo" }),
    );
    renderApp(path);
    const dialog = await openDialog();
    const clear = within(dialog).getByRole("button", { name: r.clear });
    await userEvent.click(clear);
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.getAllByRole("alertdialog")).toHaveLength(1),
    );
    expect(clear).toHaveFocus();
    expect(bodies).toEqual([]);
  });

  it("EDIT-11 does not let today or past dates be chosen", async () => {
    const { bodies } = stubReminder();
    renderApp(path);
    const dialog = await openDialog();
    await userEvent.click(dateButton(dialog));
    const calendar = screen.getByRole("dialog", { name: "Choose a date" });
    // The calendar opens a year ahead; go back to this month
    await userEvent.keyboard("{PageUp>12/}");
    // Tomorrow is the first day that can be chosen
    const dayButton = (iso: string) =>
      within(calendar).getByRole("button", { name: longDate(iso) });
    expect(dayButton(todayIso())).toHaveAttribute("aria-disabled", "true");
    expect(dayButton(nextDay(todayIso()))).not.toHaveAttribute("aria-disabled");
    expect(
      within(calendar).getByRole("button", { name: "Today" }),
    ).toBeDisabled();
    await userEvent.click(dayButton(todayIso()));
    expect(calendar).toBeVisible();
    await userEvent.keyboard("{Escape}");
    // Only the calendar closed; the dialog is still there with the same date
    expect(screen.getByRole("alertdialog")).toBeVisible();
    expect(dateButton(dialog)).toHaveTextContent(longDate(inAYear));
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
    expect(
      (await screen.findByText(m.ribbon.overdueSince)).parentElement,
    ).toHaveTextContent(formatIsoDate("2025-01-10"));
    const dialog = await openDialog();
    expect(dateButton(dialog)).toHaveTextContent(longDate(inAYear));
  });
});

describe("revalidation ribbon", () => {
  it("is yellow with a Set next date button once the reminder date has passed", async () => {
    stubApi({
      [`GET ${base}`]: () => json(makeDataset({ reminder_date: "2020-01-01" })),
    });
    renderApp(path);
    expect(
      await screen.findByText(new RegExp(m.ribbon.overdueSince)),
    ).toBeVisible();
    expect(screen.getByText(m.ribbon.overdueDetail)).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: m.ribbon.setNext }),
    );
    expect(screen.getByRole("alertdialog")).toBeVisible();
  });

  it("is the plain strip while the date is ahead", async () => {
    stubApi({
      [`GET ${base}`]: () =>
        json(makeDataset({ reminder_date: addYears(todayIso(), 1) })),
    });
    renderApp(path);
    expect(await screen.findByText(m.ribbon.due)).toBeVisible();
    expect(
      screen.queryByRole("button", { name: m.ribbon.setNext }),
    ).not.toBeInTheDocument();
  });

  it("shows the Dataset Record context line", async () => {
    stubApi({ [`GET ${base}`]: () => json(makeDataset()) });
    renderApp(path);
    expect(await screen.findByText(m.context)).toBeVisible();
  });
});

describe("overdue", () => {
  it("EDIT-14 shows overdue once, in the ribbon, on an overdue record", async () => {
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
    const label = await screen.findByText(m.ribbon.overdue);
    expect(label.closest("[data-slot=ribbon]")).toHaveAttribute(
      "data-tone",
      "overdue",
    );
    expect(screen.getAllByText(m.overdueHint)).toHaveLength(1);
    expect(
      screen.getByText(m.record.lastValidated("15 January 2024 at 10:00")),
    ).toBeVisible();
  });

  it("EDIT-14 shows no ribbon when the record is not overdue", async () => {
    stubApi({ [`GET ${base}`]: () => json(makeDataset()) });
    renderApp(path);
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByText(m.ribbon.overdue)).not.toBeInTheDocument();
    expect(document.querySelector("[data-slot=ribbon]")).toBeNull();
  });

  it("is not overdue on the reminder day itself", async () => {
    stubApi({
      [`GET ${base}`]: () => json(makeDataset({ reminder_date: todayIso() })),
    });
    renderApp(path);
    expect(await screen.findByText(m.ribbon.due)).toBeVisible();
    expect(screen.queryByText(m.ribbon.overdueSince)).not.toBeInTheDocument();
  });
});
