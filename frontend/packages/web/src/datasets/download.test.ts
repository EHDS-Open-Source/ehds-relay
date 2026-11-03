import { describe, expect, it, vi } from "vitest";

import { downloadText, exportFileName, slugify } from "./download";

describe("slugify", () => {
  it.each([
    ["Hospital Admissions 2023", "hospital-admissions-2023"],
    ["  Données de santé!  ", "donnees-de-sante"],
    ["a --- b", "a-b"],
    ["日本語", ""],
  ])("%s -> %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe("exportFileName", () => {
  it("uses the slug and the format's extension", () => {
    expect(exportFileName("My Data", "ttl", "dataset")).toBe("my-data.ttl");
    expect(exportFileName("My Data", "jsonld", "dataset")).toBe(
      "my-data.jsonld",
    );
    expect(exportFileName("My Data", "rdfxml", "dataset")).toBe("my-data.rdf");
  });

  it("falls back when there is no usable title", () => {
    expect(exportFileName(null, "ttl", "dataset")).toBe("dataset.ttl");
    expect(exportFileName("!!!", "rdfxml", "dataset")).toBe("dataset.rdf");
  });
});

describe("downloadText", () => {
  it("clicks a link with the file name and a blob of the right type", () => {
    const create = vi.fn(() => "blob:x");
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    let name = "";
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        name = this.download;
      });
    downloadText("hello", "a.ttl", "text/turtle");
    const blobs = create.mock.calls as unknown as [Blob][];
    expect(blobs[0]?.[0].type).toBe("text/turtle");
    expect(name).toBe("a.ttl");
    expect(click).toHaveBeenCalled();
    expect(revoke).toHaveBeenCalledWith("blob:x");
  });
});
