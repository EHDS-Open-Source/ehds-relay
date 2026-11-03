import { describe, expect, it } from "vitest";

import { zDatasetMetadata, zTerm } from "./index";

describe("generated Zod schemas", () => {
  it("accepts a valid term and rejects one without a web address", () => {
    expect(
      zTerm.safeParse({ label: "CSV", uri: "http://example.org/csv" }).success,
    ).toBe(true);
    expect(zTerm.safeParse({ label: "CSV", uri: "not a url" }).success).toBe(
      false,
    );
  });

  it("checks contact emails and language tags like the backend", () => {
    expect(
      zDatasetMetadata.safeParse({
        contact_points: [{ name: "Desk", email: "desk@example.org" }],
        title: [{ lang: "pt-BR", text: "Título" }],
      }).success,
    ).toBe(true);
    expect(
      zDatasetMetadata.safeParse({
        contact_points: [{ name: "Desk", email: "no-at-sign" }],
      }).success,
    ).toBe(false);
    expect(
      zDatasetMetadata.safeParse({ title: [{ lang: "english", text: "x" }] })
        .success,
    ).toBe(false);
  });
});
