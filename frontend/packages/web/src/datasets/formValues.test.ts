import { zDatasetMetadata } from "@ehds-relay/api-client";
import { describe, expect, it } from "vitest";

import {
  emptyTerm,
  formPath,
  fromMetadata,
  mapToMetadata,
  toMetadata,
} from "./formValues";
import { goldenExamples } from "./goldenExamples";

describe("fromMetadata / toMetadata", () => {
  it.each(Object.entries(goldenExamples))(
    "round-trips the %s golden example unchanged",
    (_, metadata) => {
      expect(toMetadata(fromMetadata(metadata))).toEqual(metadata);
      expect(zDatasetMetadata.safeParse(metadata).success).toBe(true);
    },
  );

  it("reads metadata as the server stores it, with nulls and empty lists", () => {
    const stored = {
      ...goldenExamples.public_minimal,
      variables: [],
      provenance: null,
      publisher: null,
      temporal_coverage: { start: "2023-01-01", end: null },
      number_of_unique_individuals: null,
      quantum_label: null,
    };
    expect(toMetadata(fromMetadata(stored))).toEqual(
      goldenExamples.public_minimal,
    );
  });

  it("gives an empty form one row per list and maps it to nothing", () => {
    const values = fromMetadata();
    expect(values.title).toEqual([{ lang: "en", text: "" }]);
    expect(values.health_theme).toEqual([emptyTerm()]);
    expect(values.distributions[0]?.applicable_legislation).toHaveLength(1);
    expect(toMetadata(values)).toEqual({});
  });

  it("trims text, drops empty rows and parses numbers", () => {
    const values = fromMetadata();
    values.title = [
      { lang: "en", text: "  Beds  " },
      { lang: "fr", text: " " },
    ];
    values.health_theme = [
      emptyTerm(),
      { label: " Systems ", uri: " https://x.example/s " },
    ];
    values.keyword = [" a ", ""];
    values.number_of_records = " 12 ";
    expect(toMetadata(values)).toEqual({
      title: [{ lang: "en", text: "Beds" }],
      health_theme: [{ label: "Systems", uri: "https://x.example/s" }],
      keyword: ["a"],
      number_of_records: 12,
    });
  });

  it("leaves out an empty organisation but keeps a half-filled one", () => {
    const values = fromMetadata();
    values.publisher.contact_point.email = "p@example.org";
    expect(toMetadata(values)).toEqual({
      publisher: {
        name: "",
        contact_point: { name: "", email: "p@example.org" },
      },
    });
  });

  it("sends variables only when the data is structured", () => {
    const values = fromMetadata(goldenExamples.non_public_full);
    values.structured_data = "no";
    expect(toMetadata(values).variables).toBeUndefined();
    values.structured_data = "";
    expect(toMetadata(values)).not.toHaveProperty("structured_data");
    expect(toMetadata(values).variables).toBeUndefined();
    values.structured_data = "yes";
    expect(toMetadata(values).variables).toHaveLength(2);
  });

  it("maps error paths back to the rows they came from", () => {
    const values = fromMetadata();
    values.distributions = [
      {
        title: "",
        description: "",
        access_url: "",
        format: emptyTerm(),
        applicable_legislation: [emptyTerm()],
      },
      {
        title: "x",
        description: "",
        access_url: "bad",
        format: emptyTerm(),
        applicable_legislation: [emptyTerm(), { label: "L", uri: "" }],
      },
    ];
    const { indexMap } = mapToMetadata(values);
    expect(formPath(["distributions", 0, "access_url"], indexMap)).toBe(
      "distributions.1.access_url",
    );
    expect(
      formPath(
        ["distributions", 0, "applicable_legislation", 0, "uri"],
        indexMap,
      ),
    ).toBe("distributions.1.applicable_legislation.1.uri");
    expect(formPath(["keyword", 0], indexMap)).toBe("keyword.0");
  });
});
