import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  expectedFiles,
  themeResources,
} from "../../../scripts/sync-keycloak-theme.mjs";

// The Keycloak sign-in and email theme (deploy/helm/ehds-relay/files/keycloak-theme) shares the
// app's look. Most of its brand files are copies made by scripts/sync-keycloak-theme.mjs; the
// logo and the email colours are written out by hand. This fails when either drifts from the
// app. Fix a copy with `make -C frontend keycloak_theme`; fix the hand-made ones by hand.
const theme = join(themeResources, "../..");
const read = (path: string) => readFileSync(path, "utf8");

/** The `d` attribute of every <path> in an SVG or TSX file, in order. */
const pathData = (source: string) =>
  [...source.matchAll(/<path\s+d="([^"]+)"/g)].map((match) => match[1]);

describe("Keycloak theme", () => {
  it("has up-to-date copies of the brand tokens, fonts, stars and favicons", async () => {
    const stale = [];
    for (const [name, contents] of await expectedFiles()) {
      const current = readFileSync(join(themeResources, name));
      if (!current.equals(Buffer.from(contents))) stale.push(name);
    }
    expect(stale, "run make -C frontend keycloak_theme").toEqual([]);
  });

  it("draws the same logo as the app", () => {
    const app = pathData(read(join(__dirname, "../../web/src/shell/Logo.tsx")));
    const copy = pathData(read(join(themeResources, "img/logo.svg")));
    expect(app.length).toBeGreaterThan(0);
    expect(copy).toEqual(app);
  });

  it("uses only brand colours in the emails", () => {
    const tokens = read(join(themeResources, "css/tokens.css")).toLowerCase();
    const html = join(theme, "email/html");
    const colours = readdirSync(html).flatMap((name) =>
      [...read(join(html, name)).matchAll(/#[0-9a-f]{6}\b/gi)].map((match) =>
        match[0].toLowerCase(),
      ),
    );
    expect(colours.length).toBeGreaterThan(0);
    expect(
      colours.filter((colour) => !tokens.includes(`: ${colour};`)),
    ).toEqual([]);
  });
});
