import { describe, expect, it } from "vitest";

import { shellMessages } from "../shell/messages";
import { emptyTerm, fromMetadata, mapToMetadata } from "./formValues";
import { goldenExamples } from "./goldenExamples";
import { serverIssues, toFieldErrors, validateForSave } from "./validate";

const errors = shellMessages.datasetForm.errors;

describe("validateForSave", () => {
  it("accepts both golden examples", () => {
    for (const metadata of Object.values(goldenExamples)) {
      expect(validateForSave(fromMetadata(metadata))).toEqual({
        ok: true,
        metadata,
      });
    }
  });

  it("needs a title", () => {
    expect(validateForSave(fromMetadata())).toEqual({
      ok: false,
      issues: [
        {
          path: "title.0.text",
          message: shellMessages.datasetForm.status.titleRequired,
        },
      ],
    });
  });

  it("rejects a title and keywords over the length limits", () => {
    const values = fromMetadata({ title: [{ lang: "en", text: "T" }] });
    values.title = [{ lang: "en", text: "x".repeat(201) }];
    values.keyword = Array.from({ length: 21 }, (_, i) => `k${i}`);
    const result = validateForSave(values);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const paths = result.issues.map((i) => i.path);
    expect(paths).toContain("title.0.text");
    expect(paths).toContain("keyword");
  });

  it("reports the backend's rules on the field they belong to", () => {
    const values = fromMetadata({ title: [{ lang: "en", text: "T" }] });
    values.health_theme = [emptyTerm(), { label: "Theme", uri: "not a url" }];
    values.contact_points = [{ name: "Desk", email: "nope" }];
    values.title.push({ lang: "", text: "Titre" });
    values.number_of_records = "-1";
    values.publisher.type = { label: "", uri: "https://example.org/t" };
    const result = validateForSave(values);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(
      Object.fromEntries(result.issues.map((i) => [i.path, i.message])),
    ).toEqual({
      "health_theme.1.uri": errors.url,
      "contact_points.0.email": errors.email,
      "title.1.lang": errors.lang,
      number_of_records: errors.wholeNumber,
      "publisher.name": errors.required,
      "publisher.type.label": errors.required,
    });
  });

  it("asks for legislation on a distribution", () => {
    const values = fromMetadata({ title: [{ lang: "en", text: "T" }] });
    values.distributions[0]!.access_url = "https://example.org/a";
    const result = validateForSave(values);
    expect(result).toEqual({
      ok: false,
      issues: [
        {
          path: "distributions.0.applicable_legislation",
          message: errors.atLeastOne,
        },
      ],
    });
  });
});

describe("serverIssues", () => {
  it("maps 422 locations to form paths, past dropped rows", () => {
    const values = fromMetadata({ title: [{ lang: "en", text: "T" }] });
    values.contact_points = [
      { name: "", email: "" },
      { name: "Desk", email: "d@x" },
    ];
    const { indexMap } = mapToMetadata(values);
    expect(
      serverIssues(
        [
          {
            loc: ["body", "metadata", "contact_points", 0, "email"],
            msg: "bad",
          },
          { loc: ["body", "metadata", "quantum_label"], msg: "bad turtle" },
          { loc: ["body"], msg: "Value error, a title is required" },
        ],
        indexMap,
      ),
    ).toEqual([
      { path: "contact_points.1.email", message: errors.email },
      { path: "quantum_label", message: shellMessages.datasetForm.invalid },
      { path: "", message: shellMessages.datasetForm.invalid },
    ]);
  });
});

describe("toFieldErrors", () => {
  it("nests issues by path", () => {
    expect(
      toFieldErrors([
        { path: "title.0.text", message: "a" },
        { path: "title.0.text", message: "second is ignored" },
        { path: "provenance", message: "b" },
      ]),
    ).toEqual({
      title: { 0: { text: { type: "validate", message: "a" } } },
      provenance: { type: "validate", message: "b" },
    });
  });
});
