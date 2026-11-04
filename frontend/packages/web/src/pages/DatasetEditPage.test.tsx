import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { fieldAnchorId } from "../datasets/fields";
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

const form = shellMessages.datasetForm;
const m = shellMessages.datasets;
const record = `/orgs/${ORG}/datasets/${ID}`;
const edit = `${record}/edit`;

async function choose(action: string) {
  await userEvent.click(
    await screen.findByRole("button", { name: form.actions.saveMenu }),
  );
  await userEvent.click(await screen.findByRole("menuitem", { name: action }));
}

function inputOf(key: string): HTMLElement {
  const anchor = document.getElementById(fieldAnchorId(key));
  const input = anchor?.querySelector<HTMLElement>("input, textarea, select");
  if (!input) throw new Error(`no input for ${key}`);
  return input;
}

const titleBox = () =>
  within(document.getElementById(fieldAnchorId("title"))!).getByLabelText(
    form.fields.title,
  );

describe("dataset edit page", () => {
  it("fills the form with the saved dataset", async () => {
    stubApi({ [`GET ${base}`]: () => json(makeDataset()) });
    renderApp(edit);
    expect(
      await screen.findByRole("form", { name: form.formLabel }),
    ).toBeVisible();
    expect(titleBox()).toHaveValue("Hospital Admissions");
  });

  it("saves a draft with the version read, stays and saves again with the new one", async () => {
    const versions: unknown[] = [];
    let version = 3;
    stubApi({
      [`GET ${base}`]: () => json(makeDataset()),
      [`PUT ${base}`]: async (request) => {
        versions.push(((await request.json()) as { version: number }).version);
        version += 1;
        return json(makeDataset({ status: "draft", version }));
      },
    });
    const router = renderApp(edit);
    await screen.findByRole("form", { name: form.formLabel });

    await choose(form.actions.saveDraft);
    expect(await screen.findByText(form.status.savedDraft)).toBeVisible();
    expect(router.state.location.pathname).toBe(edit);

    await choose(form.actions.saveDraft);
    await waitFor(() => {
      expect(versions).toEqual([3, 4]);
    });
  });

  it("opens the record after a successful publish", async () => {
    let body: unknown;
    stubApi({
      [`GET ${base}`]: () => json(makeDataset()),
      [`PUT ${base}`]: async (request) => {
        body = await request.json();
        return json(makeDataset({ version: 4 }));
      },
    });
    const router = renderApp(edit);
    await screen.findByRole("form", { name: form.formLabel });
    await choose(form.actions.saveAndPublish);
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(record);
    });
    expect(body).toMatchObject({ publish: true, version: 3 });
  });

  it("shows the draft message and the missing list it arrived with", async () => {
    stubApi({
      [`GET ${base}`]: () =>
        json(
          makeDataset({ status: "draft", missing_for_publish: ["provenance"] }),
        ),
    });
    renderApp(`${edit}?saved=incomplete`);
    expect(
      await screen.findByRole("heading", { name: form.missing.title }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: form.fields.provenance }),
    ).toBeVisible();
  });

  it("offers Reload after someone else saved, and refills the form", async () => {
    let reads = 0;
    stubApi({
      [`GET ${base}`]: () => {
        reads += 1;
        if (reads === 1) return json(makeDataset());
        const changed = makeDataset({ version: 5 });
        changed.metadata.title = [{ lang: "en", text: "Changed elsewhere" }];
        return json(changed);
      },
      [`PUT ${base}`]: () => json({ detail: "stale" }, 409),
    });
    const router = renderApp(edit);
    await screen.findByRole("form", { name: form.formLabel });
    await choose(form.actions.saveDraft);

    const alert = await findAlert();
    expect(alert).toHaveTextContent(m.save.conflictTitle);
    expect(router.state.location.pathname).toBe(edit);

    await userEvent.click(
      within(alert).getByRole("button", { name: m.save.reload }),
    );
    await userEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: m.save.reload,
      }),
    );
    await waitFor(() => {
      expect(titleBox()).toHaveValue("Changed elsewhere");
    });
    expect(screen.queryByText(m.save.conflictTitle)).not.toBeInTheDocument();
  });

  it("says when the user may not change the dataset", async () => {
    stubApi({
      [`GET ${base}`]: () => json(makeDataset()),
      [`PUT ${base}`]: () => json({ detail: "no" }, 403),
    });
    renderApp(edit);
    await screen.findByRole("form", { name: form.formLabel });
    await choose(form.actions.saveDraft);
    expect(await screen.findByText(m.save.forbidden)).toBeVisible();
  });

  it("says when the dataset does not exist", async () => {
    stubApi({ [`GET ${base}`]: () => json({ detail: "no" }, 404) });
    renderApp(edit);
    expect(await screen.findByText(m.notFound.title)).toBeVisible();
  });

  it.each(["provenance", "publisher.contact_point"])(
    "focuses the field named in the address (%s)",
    async (key) => {
      stubApi({ [`GET ${base}`]: () => json(makeDataset()) });
      renderApp(`${edit}#${fieldAnchorId(key)}`);
      await screen.findByRole("form", { name: form.formLabel });
      await waitFor(() => {
        expect(inputOf(key)).toHaveFocus();
      });
    },
  );

  it("lands on the field from the record's missing list", async () => {
    stubApi({
      [`GET ${base}`]: () =>
        json(
          makeDataset({ status: "draft", missing_for_publish: ["provenance"] }),
        ),
    });
    const router = renderApp(record);
    await userEvent.click(
      await screen.findByRole("link", { name: form.fields.provenance }),
    );
    await waitFor(() => {
      expect(router.state.location.pathname).toBe(edit);
    });
    await waitFor(() => {
      expect(inputOf("provenance")).toHaveFocus();
    });
  });
});
