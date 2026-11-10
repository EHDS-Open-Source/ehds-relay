import { expect, type APIResponse, type Page } from "@playwright/test";

import { shellMessages } from "../packages/web/src/shell/messages.ts";

export { shellMessages as text };

/** A dev user from the realm import. Override with env vars if your realm differs. */
export interface User {
  username: string;
  password: string;
}

export const owner: User = {
  username: process.env.E2E_OWNER_USER ?? "owner",
  password: process.env.E2E_OWNER_PASSWORD ?? "Owner-pass-1!",
};

export const standard: User = {
  username: process.env.E2E_STANDARD_USER ?? "standard",
  password: process.env.E2E_STANDARD_PASSWORD ?? "Standard-pass-1!",
};

/** A name no earlier run has used: the dev database keeps everything between runs. */
export function unique(prefix: string): string {
  return `${prefix} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Signs in through the app's sign-in page and Keycloak's own login form, and waits until
 * the browser is back in the app.
 */
export async function signIn(page: Page, user: User): Promise<void> {
  await page.goto("/sign-in");
  const appOrigin = new URL(page.url()).origin;
  await page
    .getByRole("link", { name: shellMessages.signIn.action, exact: true })
    .click();
  // Keycloak's default login theme
  await page.locator("#username").fill(user.username);
  await page.locator("#password").fill(user.password);
  await page.locator("#kc-login").click();
  // Back in the app, past the API's callback and the start page's redirect
  await page.waitForURL(
    (url) =>
      url.origin === appOrigin &&
      !url.pathname.startsWith("/api/") &&
      url.pathname !== "/" &&
      url.pathname !== "/sign-in",
  );
}

/** The API's CSRF guard wants this header on every state-changing call. */
const csrf = { "X-Requested-By": "ehds-relay" };

/** A JSON call to the API with the page's session cookie. */
export async function apiPut(
  page: Page,
  path: string,
  data: unknown,
): Promise<APIResponse> {
  return page.request.put(path, { data, headers: csrf });
}

/** `/orgs/<org>/datasets/<id>` from the current address. */
export function datasetPath(url: string): { orgId: string; datasetId: string } {
  const match = /\/orgs\/([^/]+)\/datasets\/([^/?#]+)/.exec(url);
  if (!match) throw new Error(`Not a dataset address: ${url}`);
  return { orgId: match[1]!, datasetId: match[2]! };
}

/**
 * Creates an organisation through the form at /orgs/new and waits for its (empty)
 * catalogue. Returns the organisation's id.
 */
export async function createOrg(page: Page, name: string): Promise<string> {
  await page.goto("/orgs/new");
  await page.getByLabel(shellMessages.newOrg.nameLabel).fill(name);
  await page.getByLabel(shellMessages.newOrg.countryLabel).click();
  await page
    .getByRole("option", { name: shellMessages.countries.BE, exact: true })
    .click();
  await page.getByRole("button", { name: shellMessages.newOrg.submit }).click();
  await expect(page).toHaveURL(/\/orgs\/[^/]+\/catalogue/);
  const match = /\/orgs\/([^/]+)\/catalogue/.exec(page.url());
  return match![1]!;
}

/** A JSON POST to the API with the page's session cookie. */
export async function apiPost(
  page: Page,
  path: string,
  data: unknown,
): Promise<APIResponse> {
  return page.request.post(path, { data, headers: csrf });
}
