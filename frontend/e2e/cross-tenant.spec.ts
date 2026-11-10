import { expect, test } from "@playwright/test";

import {
  apiPost,
  createOrg,
  owner,
  signIn,
  standard,
  text,
  unique,
} from "./support";

test("AUTH-5 another user cannot open an organisation's dataset", async ({
  browser,
}) => {
  // The owner sets up an organisation with one draft dataset
  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await signIn(ownerPage, owner);
  const orgId = await createOrg(ownerPage, unique("E2E private"));
  const title = unique("E2E secret dataset");
  const created = await apiPost(
    ownerPage,
    `/api/v1/organisations/${orgId}/datasets`,
    { metadata: { title: [{ lang: "en", text: title }] } },
  );
  expect(created.status()).toBe(201);
  const { id: datasetId } = (await created.json()) as { id: string };
  const datasetUrl = `/orgs/${orgId}/datasets/${datasetId}`;
  await ownerPage.goto(datasetUrl);
  await expect(ownerPage.getByRole("heading", { name: title })).toBeVisible();
  await ownerContext.close();

  // Someone who is not a member, in a browser of their own
  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  await signIn(otherPage, standard);
  await otherPage.goto(datasetUrl);
  await expect(
    otherPage.getByRole("heading", { name: text.notFound.title }),
  ).toBeVisible();
  await expect(otherPage.getByText(title)).toHaveCount(0);

  // The API does not admit the organisation or the dataset exist
  const api = await otherPage.request.get(
    `/api/v1/organisations/${orgId}/datasets/${datasetId}`,
  );
  expect(api.status()).toBe(404);
  await otherContext.close();
});
