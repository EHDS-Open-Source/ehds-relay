import { readdirSync, readFileSync, statSync } from "node:fs";
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
