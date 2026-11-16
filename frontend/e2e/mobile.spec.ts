import { expect, test, type Page } from "@playwright/test";

import { apiPost, createOrg, owner, signIn, text, unique } from "./support";

// Phone layout checks, run in the `phone` (390x844) and `landscape` (844x390) projects only.

/**
 * No horizontal overflow: the page is not wider than the window and no element reaches past
 * the right edge. The export code panel scrolls on its own, so what is inside it is ignored.
 */
export async function expectNoOverflow(page: Page, what: string) {
  const result = await page.evaluate(() => {
    const width = window.innerWidth;
    const wide: string[] = [];
    for (const element of document.body.querySelectorAll("*")) {
      if (element.closest("[data-slot=code-block]")) continue;
      const box = element.getBoundingClientRect();
      if (box.width === 0 && box.height === 0) continue;
      if (box.right > width + 0.5) {
        wide.push(
          `${element.tagName.toLowerCase()}${element.className ? "." + String(element.className).split(" ")[0] : ""} right=${Math.round(box.right)}`,
        );
      }
    }
    return {
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: width,
      wide: wide.slice(0, 10),
    };
  });
  expect(result.scrollWidth, `${what}: page width`).toBeLessThanOrEqual(
    result.innerWidth,
  );
  expect(result.wide, `${what}: elements past the right edge`).toEqual([]);
}

const statePath = "test-results/phone-state.json";
let orgId = "";
let datasetId = "";

test.beforeAll(async ({ browser }) => {
  // Local runs against another port (the sign-in redirect points at the default port) can pass
  // a saved signed-in browser state in E2E_STORAGE_STATE instead of signing in here.
  const saved = process.env.E2E_STORAGE_STATE;
  const context = await browser.newContext({
    storageState: saved ?? { cookies: [], origins: [] },
  });
  const page = await context.newPage();
  if (!saved) await signIn(page, owner);
  orgId = await createOrg(page, unique("E2E phone"));
  const created = await apiPost(
    page,
    `/api/v1/organisations/${orgId}/datasets`,
    {
      metadata: { title: [{ lang: "en", text: unique("Phone dataset") }] },
    },
  );
  expect(created.status()).toBe(201);
  datasetId = ((await created.json()) as { id: string }).id;
  await context.storageState({ path: statePath });
  await context.close();
});

test.use({ storageState: statePath });

const routes = () =>
  [
    ["catalogue", `/orgs/${orgId}/catalogue`],
    ["new dataset", `/orgs/${orgId}/datasets/new`],
    ["record", `/orgs/${orgId}/datasets/${datasetId}`],
    ["edit", `/orgs/${orgId}/datasets/${datasetId}/edit`],
    ["export", `/orgs/${orgId}/datasets/${datasetId}/export`],
    ["members", `/orgs/${orgId}/members`],
    ["settings", `/orgs/${orgId}/settings`],
    ["account", "/account"],
    ["new organisation", "/orgs/new"],
  ] as const;

test.describe("no horizontal overflow", () => {
  for (const [name] of routes()) {
    test(name, async ({ page }) => {
      const route = routes().find((r) => r[0] === name)!;
      await page.goto(route[1]);
      await page.waitForLoadState("networkidle");
      await expectNoOverflow(page, name);
    });
  }
});

// The dataset form's section strip. Phones in portrait only: on a short screen it scrolls
// away with the page.
const stripRoutes = () =>
  [
    ["new", `/orgs/${orgId}/datasets/new`],
    ["edit", `/orgs/${orgId}/datasets/${datasetId}/edit`],
  ] as const;

for (const [kind] of stripRoutes()) {
  test.describe(`section strip (${kind})`, () => {
    test.beforeEach(async ({ page }, info) => {
      test.skip(info.project.name !== "phone", "portrait phones only");
      const route = stripRoutes().find((r) => r[0] === kind)!;
      await page.goto(route[1]);
      const nav = page.getByRole("navigation", {
        name: text.datasetForm.sectionNavLabel,
      });
      await expect(nav).toBeVisible();
    });

    const nav = (page: Page) =>
      page.getByRole("navigation", { name: text.datasetForm.sectionNavLabel });
    // Wait until the page has stopped moving (a smooth jump down a long form takes a while)
    const settle = async (page: Page) => {
      let last = -1;
      for (let i = 0; i < 40; i++) {
        await page.waitForTimeout(300);
        const now = await page.evaluate(() => window.scrollY);
        if (now === last) return;
        last = now;
      }
    };

    test("sits right under the header after scrolling, edge to edge", async ({
      page,
    }) => {
      await page.evaluate(() => window.scrollBy(0, 600));
      await settle(page);
      const gap = await page.evaluate((label) => {
        const header = document
          .querySelector("header")!
          .getBoundingClientRect();
        const strip = document
          .querySelector(`nav[aria-label="${label}"]`)!
          .getBoundingClientRect();
        return {
          overlap: header.bottom - strip.top,
          left: strip.left,
          right: strip.right,
          width: window.innerWidth,
        };
      }, text.datasetForm.sectionNavLabel);
      expect(Math.abs(gap.overlap)).toBeLessThanOrEqual(1);
      expect(gap.left).toBeCloseTo(0, 0);
      expect(gap.right).toBeCloseTo(gap.width, 0);
    });

    test("does not scroll up and down", async ({ page }) => {
      const strip = nav(page).locator("ul");
      const extra = await strip.evaluate((ul) => ({
        extra: ul.scrollHeight - ul.clientHeight,
        overflowY: getComputedStyle(ul).overflowY,
      }));
      expect(extra.extra).toBe(0);
      expect(extra.overflowY).toBe("hidden");
    });

    test("tapping the last entry moves the strip one way, and the heading lands below it", async ({
      page,
    }) => {
      const link = nav(page).getByRole("link").last();
      const target = ((await link.getAttribute("href")) ?? "").slice(1);
      await page.evaluate(() => {
        const ul = document.querySelector("nav ul") as HTMLElement;
        const w = window as unknown as { __samples: number[] };
        w.__samples = [];
        const sample = () => {
          w.__samples.push(ul.scrollLeft);
          requestAnimationFrame(sample);
        };
        sample();
      });
      await link.tap();
      await settle(page);
      const { samples, gap } = await page.evaluate((id) => {
        const ul = document.querySelector("nav ul") as HTMLElement;
        const nav = document.querySelector("nav") as HTMLElement;
        return {
          samples: (window as unknown as { __samples: number[] }).__samples,
          gap:
            document.getElementById(id)!.getBoundingClientRect().top -
            nav.getBoundingClientRect().bottom,
          max: ul.scrollWidth - ul.clientWidth,
        };
      }, target);
      let up = false;
      let down = false;
      for (let i = 1; i < samples.length; i++) {
        if (samples[i]! > samples[i - 1]!) up = true;
        if (samples[i]! < samples[i - 1]!) down = true;
      }
      expect(up && down, "strip scrolled both ways").toBe(false);
      expect(gap).toBeGreaterThanOrEqual(8);
      expect(gap).toBeLessThanOrEqual(40);
    });

    test("a sideways swipe is not undone by scrolling within the section", async ({
      page,
    }) => {
      await page.evaluate(() => window.scrollBy(0, 600));
      await settle(page);
      const ul = nav(page).locator("ul");
      await ul.evaluate((el) => {
        el.scrollLeft = el.scrollWidth;
      });
      await settle(page);
      const before = await ul.evaluate((el) => el.scrollLeft);
      expect(before).toBeGreaterThan(0);
      await page.evaluate(() => window.scrollBy(0, 80));
      await settle(page);
      expect(await ul.evaluate((el) => el.scrollLeft)).toBe(before);
    });
  });
}
