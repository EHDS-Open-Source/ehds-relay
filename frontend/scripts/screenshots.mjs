// Screenshots of the core screens, for design review.
// Read-only: it signs in and looks; it never submits a form or confirms a delete.
//
//   make screenshots
//
// UI_URL       where the web app is served (default: http://localhost:${WEB_PORT:-5173}, the Vite dev server)
// FN_USER      Keycloak username (default: the dev owner from the README; there is no .dev.env entry for it)
// FN_PASSWORD  its password (default: the dev owner's throwaway password from the README)
// OUT_DIR      where the PNGs go (default: ~/ehds-relay-screenshots/<today>)
//
// Pages come from the side menu and the links on each page, so a new page in
// packages/web/src/router/routes.ts shows up here by itself. The organisation shown is the first
// one that has a dataset to open. The app has one light theme, so there is no dark mode to force.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "@playwright/test";

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

const UI_URL = (
  process.env.UI_URL ?? `http://localhost:${process.env.WEB_PORT ?? "5173"}/`
).replace(/\/*$/, "/");
const OUT_DIR =
  process.env.OUT_DIR ??
  path.join(
    os.homedir(),
    "ehds-relay-screenshots",
    new Date().toLocaleDateString("sv-SE"),
  );
const USER = process.env.FN_USER ?? "owner";
const PASSWORD = process.env.FN_PASSWORD ?? "Owner-pass-1!";

const href = (h) => new URL(h, UI_URL).href;
const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Waits until the page has stopped fetching and its loading star is gone. */
async function settle(page) {
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(
    () => !document.querySelector('[data-slot="loading-star"]'),
  );
}

async function visit(page, url) {
  await page.goto(url);
  await settle(page);
}

/** Opens the app's sign-in page and follows its Sign in link to Keycloak's own form. */
async function openKeycloakForm(page) {
  await visit(page, href("sign-in"));
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await page.locator("#username").waitFor();
}

/** Signs in through Keycloak's form and waits until the browser is back in the app. */
async function login(page) {
  await openKeycloakForm(page);
  await page.fill("#username", USER);
  await page.fill("#password", PASSWORD);
  await page.click("#kc-login");
  const appOrigin = new URL(UI_URL).origin;
  await page
    .waitForURL(
      (url) =>
        url.origin === appOrigin &&
        !url.pathname.startsWith("/api/") &&
        url.pathname !== "/" &&
        url.pathname !== "/sign-in",
      { timeout: 15_000 },
    )
    .catch(() => {
      throw new Error(`Login as ${USER} did not reach the app`);
    });
  await settle(page);
}

async function newContext(browser, viewport) {
  return browser.newContext({ viewport });
}

const linksIn = (page, selector) =>
  page
    .locator(selector)
    .evaluateAll((as) => as.map((a) => a.getAttribute("href")));

const menuLinks = (page) =>
  page.locator("[role=dialog] a").evaluateAll((as) =>
    as.map((a) => ({
      href: a.getAttribute("href"),
      label: a.textContent.trim(),
    })),
  );

async function openMenu(page) {
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.locator("[role=dialog]").waitFor();
}

const isDataset = (h) =>
  /\/datasets\/[^/]+$/.test(h) && !h.endsWith("/datasets/new");

/** The first organisation that has a dataset to open, else the first one; its catalogue address. */
async function pickOrg(page) {
  await visit(page, href("orgs"));
  const here = new URL(page.url()).pathname;
  if (/\/orgs\/[^/]+\/catalogue$/.test(here))
    return { catalogue: here, steps: [] };
  const create = (await linksIn(page, "main a")).find((h) =>
    h.endsWith("/orgs/new"),
  );
  const steps = create ? [{ slug: "new-organisation", url: href(create) }] : [];
  const orgs = (await linksIn(page, "main a")).filter((h) =>
    /\/orgs\/[^/]+\/catalogue$/.test(h),
  );
  for (const org of orgs) {
    await visit(page, href(org));
    if ((await linksIn(page, "main a")).some(isDataset))
      return { catalogue: org, steps };
  }
  return { catalogue: orgs[0], steps };
}

/** The catalogue, its add-dataset form, then the first dataset with its edit and export pages. */
async function catalogueSteps(page, catalogueHref) {
  await visit(page, href(catalogueHref));
  const steps = [{ slug: "catalogue", url: href(catalogueHref) }];
  const links = await linksIn(page, "main a");

  const create = links.find((h) => h.endsWith("/datasets/new"));
  if (create) steps.push({ slug: "dataset-new-form", url: href(create) });

  const dataset = links.find(isDataset);
  if (!dataset) {
    console.log("No datasets: only the empty catalogue is captured");
    return steps;
  }
  steps.push({ slug: "dataset-detail", url: href(dataset) });
  await visit(page, href(dataset));
  const below = await linksIn(page, `main a[href^="${dataset}/"]`);
  for (const sub of below)
    steps.push({ slug: `dataset-${sub.split("/").pop()}`, url: href(sub) });
  return steps;
}

/** Logs in once and walks the side menu, in menu order. */
async function discover(browser) {
  const context = await newContext(browser, DESKTOP);
  const page = await context.newPage();
  await login(page);
  const { catalogue, steps: extra } = await pickOrg(page);
  if (!catalogue) throw new Error("No organisation to show: create one first");
  await visit(page, href(catalogue));
  await openMenu(page);
  const menu = await menuLinks(page);
  await page.keyboard.press("Escape");

  const steps = [];
  for (const item of menu) {
    if (item.href.endsWith("/catalogue"))
      steps.push(...(await catalogueSteps(page, item.href)));
    else steps.push({ slug: slugify(item.label), url: href(item.href) });
  }
  steps.push(...extra);
  await context.close();
  return { menu, steps };
}

async function shot(page, number, slug) {
  const file = path.join(
    OUT_DIR,
    `${String(number).padStart(2, "0")}-${slug}.png`,
  );
  await page.screenshot({ path: file, fullPage: true, animations: "disabled" });
  console.log(file);
}

/** The two screens before sign-in: the app's own page, then Keycloak's form. */
async function captureSignIn(browser) {
  const context = await newContext(browser, DESKTOP);
  const page = await context.newPage();
  await visit(page, href("sign-in"));
  await shot(page, 1, "sign-in");
  await openKeycloakForm(page);
  await shot(page, 2, "keycloak-login");
  await context.close();
}

async function captureDesktop(browser, steps, failures) {
  const context = await newContext(browser, DESKTOP);
  const page = await context.newPage();
  await login(page);

  for (const [i, step] of steps.entries()) {
    try {
      await visit(page, step.url);
      await shot(page, i + 3, step.slug);
    } catch (err) {
      failures.push(`${step.slug}: ${err.message.split("\n")[0]}`);
    }
  }
  await context.close();
}

/** One narrow screen: the first menu page with the side menu open. */
async function captureMobile(browser, menu, number, failures) {
  const context = await newContext(browser, MOBILE);
  const page = await context.newPage();
  await login(page);
  try {
    await visit(page, href(menu[0].href));
    await openMenu(page);
    await shot(page, number, `mobile-${slugify(menu[0].label)}-menu-open`);
  } catch (err) {
    failures.push(`mobile: ${err.message.split("\n")[0]}`);
  }
  await context.close();
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const browser = await chromium.launch();
const failures = [];
try {
  await captureSignIn(browser);
  const { menu, steps } = await discover(browser);
  await captureDesktop(browser, steps, failures);
  await captureMobile(browser, menu, steps.length + 3, failures);
} finally {
  await browser.close();
}
if (failures.length > 0) {
  console.error(`\nFailed:\n${failures.join("\n")}`);
  process.exitCode = 1;
}
