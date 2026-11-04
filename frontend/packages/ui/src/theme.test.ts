import { readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// There is one light theme. This keeps dark-mode styling from creeping back in.
const src = __dirname;

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return tsxFiles(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

function tsFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return tsFiles(path);
    return path.endsWith(".ts") ? [path] : [];
  });
}

describe("single light theme", () => {
  it("has no dark block or dark variant in the stylesheet", () => {
    const css = readFileSync(join(src, "styles.css"), "utf8");
    expect(css).not.toMatch(/\.dark\b/);
    expect(css).not.toMatch(/custom-variant\s+dark/);
    expect(css).toMatch(/color-scheme:\s*light/);
  });

  it("uses no dark: classes in components", () => {
    const offenders = tsxFiles(src).filter((file) =>
      /\bdark:/.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});

describe("links", () => {
  it("styles inline links blue, never with the yellow primary colour", () => {
    const css = readFileSync(join(src, "styles.css"), "utf8");
    expect(css).toMatch(
      /a:where\(:not\(\[class\]\)\),\s*\.link\s*\{[^}]*color:\s*var\(--blue\)/,
    );
    const offenders = tsxFiles(join(src, "..", "..", "web", "src")).filter(
      (file) =>
        !file.endsWith(".test.tsx") &&
        /text-primary(?!-foreground)\b/.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});

// Compiles the theme with Tailwind, so the tests see the utilities components get.
async function buildUtilities(candidates: string[]): Promise<string> {
  const { compile } = await import("tailwindcss");
  const require = createRequire(import.meta.url);
  const compiler = await compile(
    readFileSync(join(src, "styles.css"), "utf8"),
    {
      base: src,
      // Tailwind itself; the animation plugin adds no theme values, so it is left out.
      loadStylesheet(id: string, base: string) {
        const path =
          id === "tailwindcss" ? require.resolve("tailwindcss/index.css") : id;
        const content = id === "tailwindcss" ? readFileSync(path, "utf8") : "";
        return Promise.resolve({ path, base, content });
      },
    },
  );
  return compiler.build(candidates);
}

function rule(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  return start === -1 ? "" : css.slice(start, css.indexOf("}", start) + 1);
}

describe("tokens", () => {
  const css = readFileSync(join(src, "styles.css"), "utf8");

  it("uses true pixels for spacing, whatever the root font size", async () => {
    expect(css).toMatch(/@theme inline \{[^}]*--spacing:\s*4px;/);
    const out = await buildUtilities(["p-8", "h-10", "size-11"]);
    expect(rule(out, ".p-8")).toContain("calc(4px * 8)");
    expect(rule(out, ".h-10")).toContain("calc(4px * 10)");
  });

  it("makes the card and overlay shadows box-shadow utilities", async () => {
    const out = await buildUtilities([
      "shadow-card",
      "shadow-card-hover",
      "shadow-overlay",
    ]);
    expect(rule(out, ".shadow-card")).toContain("var(--shadow-card)");
    expect(rule(out, ".shadow-card")).toContain("box-shadow");
    expect(rule(out, ".shadow-card-hover")).toContain(
      "var(--shadow-card-hover)",
    );
    expect(rule(out, ".shadow-overlay")).toContain("var(--shadow-overlay)");
    // A `card` colour would make shadow-card a shadow colour instead.
    expect(css).not.toMatch(/--color-card:/);
  });

  it("only offers the brand radii and shadows", async () => {
    const out = await buildUtilities([
      "rounded-card",
      "rounded-field",
      "rounded-sm",
      "rounded-lg",
      "rounded-xl",
      "shadow-md",
      "shadow-xs",
    ]);
    expect(rule(out, ".rounded-card")).toContain("var(--radius-card)");
    expect(rule(out, ".rounded-field")).toContain("var(--radius-field)");
    for (const gone of ["sm", "lg", "xl"]) {
      expect(rule(out, `.rounded-${gone}`)).toBe("");
    }
    expect(rule(out, ".shadow-md")).toBe("");
    expect(rule(out, ".shadow-xs")).toBe("");
  });

  it("draws the record section shadow as a filter", () => {
    expect(css).toMatch(/--shadow-section:\s*drop-shadow\(/);
  });

  it("treats 768px and narrower as the phone layout", () => {
    expect(css).toMatch(/--breakpoint-md:\s*48\.0625rem/);
  });

  it("keeps the brand layer at the end of the stylesheet", () => {
    const brand = css.lastIndexOf(":root {");
    expect(brand).toBeGreaterThan(css.indexOf("@layer base"));
    expect(brand).toBeGreaterThan(css.lastIndexOf("@media"));
    expect(css.slice(brand).trim().endsWith("}")).toBe(true);
    expect(css.slice(brand).match(/\}/g)).toHaveLength(1);
  });

  it("stops every animation for reduced motion except the loading star", () => {
    const block = css.slice(
      css.indexOf("@media (prefers-reduced-motion: reduce)"),
    );
    expect(block).toMatch(/animation-duration:\s*0\.01ms !important/);
    expect(block).toMatch(/animation-iteration-count:\s*1 !important/);
    expect(block).toMatch(/scroll-behavior:\s*auto !important/);
    expect(block).toMatch(/\.loading-star\s*\{\s*animation:\s*star-pulse/);
  });
});

describe("components", () => {
  const files = [
    ...tsxFiles(src),
    ...tsxFiles(join(src, "..", "..", "web", "src")),
  ]
    .concat(tsFiles(src), tsFiles(join(src, "..", "..", "web", "src")))
    .filter((file) => !/\.test\.tsx?$/.test(file));

  it("use the radius and shadow tokens, not the default scale or fixed values", () => {
    const pattern =
      /\b(rounded(-[trblxyse]{1,2})?-(xs|sm|md|lg|xl|[234]xl|\[(14|20|24)px\])|shadow-(2xs|xs|sm|md|lg|xl|2xl|\[)|ring-\[|ring-ring)/;
    const offenders = files.filter((file) =>
      pattern.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("leave transition timing to the motion tokens", () => {
    const offenders = files.filter((file) =>
      /duration-\d|duration-\[\d/.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("do not scroll smoothly without checking for reduced motion", () => {
    const offenders = files.filter((file) =>
      /behavior:\s*"smooth"/.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
