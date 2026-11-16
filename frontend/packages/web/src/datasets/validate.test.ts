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

describe("too-long texts", () => {
  const base = () => fromMetadata({ title: [{ lang: "en", text: "T" }] });
  const messages = (values: ReturnType<typeof base>) => {
    const result = validateForSave(values);
    return result.ok
      ? {}
      : Object.fromEntries(result.issues.map((i) => [i.path, i.message]));
  };

  it("says how far over a title, provenance and definition are", () => {
    const values = base();
    values.title = [{ lang: "en", text: "x".repeat(201) }];
    values.provenance = "y".repeat(2015);
    values.structured_data = "yes";
    values.variables = [
      {
        name: "n",
        data_type: "string",
        definition: "d".repeat(501),
        coding_system: "",
      },
    ];
    expect(messages(values)).toMatchObject({
      "title.0.text": errors.tooLong(200, 1),
      provenance: errors.tooLong(2000, 15),
      "variables.0.definition": errors.tooLong(500, 1),
    });
    expect(errors.tooLong(200, 15)).toBe(
      "Shorten this to 200 characters or fewer. It's 15 over.",
    );
  });

  it("accepts texts exactly at the limit", () => {
    const values = base();
    values.title = [{ lang: "en", text: "x".repeat(200) }];
    values.provenance = "y".repeat(2000);
    expect(validateForSave(values).ok).toBe(true);
  });

  it("does not give a keyword list the length message", () => {
    const values = base();
    values.keyword = Array.from({ length: 21 }, (_, i) => `k${i}`);
    expect(messages(values).keyword).not.toBe(errors.tooLong(20, 1));
    expect(messages(values).keyword).toBe(shellMessages.datasetForm.invalid);
  });

  it("maps a server string_too_long with its count, or without when unknown", () => {
    const loc = ["body", "metadata", "title", 0, "text"];
    expect(
      serverIssues(
        [
          {
            loc,
            msg: "too long",
            type: "string_too_long",
            ctx: { max_length: 200 },
            input: "x".repeat(250),
          },
        ],
        new Map(),
      ),
    ).toEqual([{ path: "title.0.text", message: errors.tooLong(200, 50) }]);
    expect(
      serverIssues(
        [
          {
            loc,
            msg: "too long",
            type: "string_too_long",
            ctx: { max_length: 200 },
          },
        ],
        new Map(),
      ),
    ).toEqual([{ path: "title.0.text", message: errors.tooLongNoCount(200) }]);
  });
});
