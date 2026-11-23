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

const outcomes = [];

/**
 * Runs one step. A failure is logged, the page is saved as failed-<name>.png when it can be,
 * and the run carries on; it only shows in the summary and the exit code.
 */
async function step(name, fn, page) {
  try {
    const value = await fn();
    outcomes.push({ name, ok: true });
    return value;
  } catch (err) {
    const message = err.message.split("\n")[0];
    console.error(`FAILED ${name}: ${message}`);
    outcomes.push({ name, ok: false, message });
    await page
      ?.screenshot({
        path: path.join(OUT_DIR, `failed-${slugify(name)}.png`),
        fullPage: true,
        timeout: 5_000,
      })
      .catch(() => {});
    return undefined;
  }
}

/** Opens the app's sign-in page and follows its Sign in link to Keycloak's own form. */
async function openKeycloakForm(page) {
  await visit(page, href("sign-in"));
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await page.locator("#username").waitFor({ timeout: 15_000 });
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
  if (orgs.length === 0)
    throw new Error("No organisation to show: create one first");
  for (const org of orgs) {
    await visit(page, href(org));
    if ((await linksIn(page, "main a")).some(isDataset))
      return { catalogue: org, steps };
  }
  return { catalogue: orgs[0], steps };
}

/**
 * Adds the catalogue, its add-dataset form, then the first dataset with its edit and export
 * pages to `steps`. What was found before a failure stays in `steps`.
 */
async function catalogueSteps(page, catalogueHref, steps) {
  await visit(page, href(catalogueHref));
  steps.push({ slug: "catalogue", url: href(catalogueHref) });
  const links = await linksIn(page, "main a");

  const create = links.find((h) => h.endsWith("/datasets/new"));
  if (create) steps.push({ slug: "dataset-new-form", url: href(create) });

  const dataset = links.find(isDataset);
  if (!dataset) {
    console.log("No datasets: only the empty catalogue is captured");
    return;
  }
  steps.push({ slug: "dataset-detail", url: href(dataset) });
  await visit(page, href(dataset));
  const below = await linksIn(page, `main a[href^="${dataset}/"]`);
  for (const sub of below)
    steps.push({ slug: `dataset-${sub.split("/").pop()}`, url: href(sub) });
}

/** Logs in once and walks the side menu, in menu order. */
async function discover(browser) {
  const context = await newContext(browser, DESKTOP);
  const page = await context.newPage();
  const steps = [];
  let menu = [];
  const signedIn = await step(
    "discover: sign in",
    () => login(page).then(() => true),
    page,
  );
  const org = signedIn
    ? await step("discover: organisation", () => pickOrg(page), page)
    : undefined;
  if (org) {
    await step(
      "discover: side menu",
      async () => {
        await visit(page, href(org.catalogue));
        await openMenu(page);
        menu = await menuLinks(page);
        await page.keyboard.press("Escape");
      },
      page,
    );
    for (const item of menu) {
      if (item.href.endsWith("/catalogue"))
        await step(
          "discover: catalogue",
          () => catalogueSteps(page, item.href, steps),
          page,
        );
      else steps.push({ slug: slugify(item.label), url: href(item.href) });
    }
    steps.push(...org.steps);
  }
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
  await step(
    "sign-in",
    async () => {
      await visit(page, href("sign-in"));
      await shot(page, 1, "sign-in");
    },
    page,
  );
  await step(
    "keycloak-login",
    async () => {
      await openKeycloakForm(page);
      await shot(page, 2, "keycloak-login");
    },
    page,
  );
  await context.close();
}

async function captureDesktop(browser, steps) {
  const context = await newContext(browser, DESKTOP);
  const page = await context.newPage();
  const signedIn = await step(
    "desktop: sign in",
    () => login(page).then(() => true),
    page,
  );
  if (signedIn) {
    for (const [i, target] of steps.entries()) {
      await step(
        target.slug,
        async () => {
          await visit(page, target.url);
          await shot(page, i + 3, target.slug);
        },
        page,
      );
    }
  }
  await context.close();
}

/** One narrow screen: the first menu page with the side menu open. */
async function captureMobile(browser, menu, number) {
  if (menu.length === 0) return;
  const context = await newContext(browser, MOBILE);
  const page = await context.newPage();
  const signedIn = await step(
    "mobile: sign in",
    () => login(page).then(() => true),
    page,
  );
  if (signedIn) {
    await step(
      "mobile",
      async () => {
        await visit(page, href(menu[0].href));
        await openMenu(page);
        await shot(page, number, `mobile-${slugify(menu[0].label)}-menu-open`);
      },
      page,
    );
  }
  await context.close();
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const browser = await chromium.launch();
try {
  await captureSignIn(browser);
  const { menu, steps } = await discover(browser);
  await captureDesktop(browser, steps);
  await captureMobile(browser, menu, steps.length + 3);
} finally {
  await browser.close();
}
const failed = outcomes.filter((o) => !o.ok);
console.log(`\n${outcomes.length - failed.length} ok, ${failed.length} failed`);
for (const f of failed) console.log(`  FAILED ${f.name}: ${f.message}`);
if (failed.length > 0) process.exitCode = 1;
