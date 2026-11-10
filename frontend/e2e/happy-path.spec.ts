import { expect, test } from "@playwright/test";

import fullRecord from "../../backend/tests/golden/non_public_full.json" with { type: "json" };
import {
  apiPut,
  createOrg,
  datasetPath,
  owner,
  signIn,
  text,
  unique,
} from "./support";

const form = text.datasetForm;

test("AUTH-1 ORG-6 ADD-9 EDIT-15 owner happy path", async ({ page }) => {
  // AUTH-1: sign in through Keycloak
  await signIn(page, owner);

  // ORG-3..5: a fresh organisation for this run, so earlier runs never get in the way
  const orgName = unique("E2E");
  await createOrg(page, orgName);

  // ORG-6: lands on the empty catalogue
  await expect(page.getByText(text.catalogue.empty.title)).toBeVisible();

  // ADD-1: a new dataset saved as a draft with only a title
  const title = unique("E2E dataset");
  await page.getByRole("link", { name: text.catalogue.addDataset }).click();
  await page.getByLabel(form.fields.title, { exact: true }).first().fill(title);
  await page.getByRole("button", { name: form.actions.saveMenu }).click();
  await page.getByRole("menuitem", { name: form.actions.saveDraft }).click();
  await expect(page.getByText(form.status.savedDraft)).toBeVisible();

  // ADD-10: Save and Publish lists what is still missing
  await page.getByRole("button", { name: form.actions.saveMenu }).click();
  await page
    .getByRole("menuitem", { name: form.actions.saveAndPublish })
    .click();
  await expect(page.getByText(form.missing.title)).toBeVisible();
  await expect(
    page.getByText(form.fields.description, { exact: true }).first(),
  ).toBeVisible();

  // The draft shows on the catalogue with its Draft chip
  await expect(page).toHaveURL(/\/datasets\/[^/]+/);
  const { orgId, datasetId } = datasetPath(page.url());
  await page.goto(`/orgs/${orgId}/catalogue`);
  const card = page.getByRole("link", { name: new RegExp(title) });
  await expect(card).toBeVisible();
  await expect(card.getByText(text.catalogue.draft)).toBeVisible();

  // Fill in the complete record in one call (the form itself is covered by unit tests)
  const apiPath = `/api/v1/organisations/${orgId}/datasets/${datasetId}`;
  const current = (await (await page.request.get(apiPath)).json()) as {
    version: number;
  };
  const saved = await apiPut(page, apiPath, {
    version: current.version,
    metadata: { ...fullRecord, title: [{ lang: "en", text: title }] },
  });
  expect(saved.status()).toBe(200);
  expect(
    ((await saved.json()) as { missing_for_publish: string[] })
      .missing_for_publish,
  ).toEqual([]);

  // ADD-9: publish from the form
  await page.goto(`/orgs/${orgId}/datasets/${datasetId}/edit`);
  await page.getByRole("button", { name: form.actions.saveMenu }).click();
  await page
    .getByRole("menuitem", { name: form.actions.saveAndPublish })
    .click();

  // EDIT-4: publishing opens the record, which shows it as published
  await expect(page).toHaveURL(
    new RegExp(`/orgs/${orgId}/datasets/${datasetId}$`),
  );
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(
    page
      .getByText(text.datasets.record.status.published, { exact: true })
      .first(),
  ).toBeVisible();

  // EDIT-15: View output has the three formats and downloads Turtle
  await page.getByRole("link", { name: text.datasets.viewOutput }).click();
  const output = text.datasets.output;
  for (const tab of Object.values(output.tabs)) {
    await expect(page.getByRole("tab", { name: tab })).toBeVisible();
  }
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: /Download/ })
    .first()
    .click();
  expect((await download).suggestedFilename()).toMatch(/\.ttl$/);

  // AUTH-7: signing out goes back to the sign-in page
  await page.getByRole("button", { name: text.menuTitle }).click();
  await page.getByRole("button", { name: text.logOut }).click();
  await expect(page).toHaveURL(/\/sign-in/);
});
