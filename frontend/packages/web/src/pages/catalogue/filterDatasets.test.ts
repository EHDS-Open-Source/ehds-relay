import { describe, expect, it } from "vitest";

import { noRevalidationData } from "../../datasets/fakeServer";
import {
  filterDatasets,
  readCatalogueFields,
  type Dataset,
} from "./filterDatasets";

function ds(
  id: string,
  metadata: Record<string, unknown>,
  extra = {},
): Dataset {
  return {
    ...noRevalidationData,
    id,
    org_id: "o",
    title: null,
    description: null,
    status: "draft",
    metadata,
    schema_version: "1",
    version: 1,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    missing_for_publish: [],
    ...extra,
  };
}

const all = [
  ds("a", {
    title: [
      { lang: "en", text: "Diabetes Registry" },
      { lang: "fr", text: "Registre du diabete" },
    ],
    description: [{ lang: "en", text: "Adult patients" }],
    keyword: ["insulin"],
    health_category: [{ label: "Cardiology", uri: "x" }],
    access_rights: "public",
  }),
  ds(
    "b",
    {
      title: [{ lang: "en", text: "Cancer" }],
      access_rights: "restricted",
    },
    { status: "published", overdue: true },
  ),
  ds("c", { title: [{ lang: "en", text: "Other" }] }),
  ds("d", "weird" as never, { title: "Old shape", description: "legacy text" }),
].map((d) => readCatalogueFields(d));

const ids = (q: string, access: Parameters<typeof filterDatasets>[2] = "all") =>
  filterDatasets(all, q, access).map((d) => d.id);

describe("filterDatasets", () => {
  it("returns everything for an empty search", () => {
    expect(ids("  ")).toEqual(["a", "b", "c", "d"]);
  });
  it.each([
    ["DIABETES", ["a"]],
    ["registre", ["a"]],
    ["adult", ["a"]],
    ["insulin", ["a"]],
    ["cardio", ["a"]],
    ["legacy", ["d"]],
    ["nothing", []],
  ])("matches %s", (q, expected) => expect(ids(q)).toEqual(expected));

  it("combines the chip with search", () => {
    expect(ids("", "public")).toEqual(["a"]);
    expect(ids("cancer", "public")).toEqual([]);
    expect(ids("cancer", "restricted")).toEqual(["b"]);
  });
  it("EDIT-14 reads the overdue flag and filters on it", () => {
    expect(all.map((d) => d.overdue)).toEqual([false, true, false, false]);
    expect(filterDatasets(all, "", "all", "overdue").map((d) => d.id)).toEqual([
      "b",
    ]);
    expect(
      filterDatasets(all, "cancer", "public", "overdue").map((d) => d.id),
    ).toEqual([]);
    expect(filterDatasets(all, "", "all", "any")).toHaveLength(4);
  });
  it("EDIT-14 counts a passed reminder date as overdue, from the day after", () => {
    const now = new Date(2026, 10, 4, 10, 0);
    const read = (reminder_date: string) =>
      readCatalogueFields(ds("r", {}, { reminder_date }), now);
    expect(read("2026-11-03")).toMatchObject({
      overdue: true,
      reminderPassed: true,
    });
    expect(read("2026-11-04")).toMatchObject({
      overdue: false,
      reminderPassed: false,
    });
    expect(read("2027-10-22").overdue).toBe(false);
  });
  it("keeps datasets without an access level under All only", () => {
    expect(ids("", "non_public")).toEqual([]);
    expect(ids("other")).toEqual(["c"]);
  });
  it("falls back to the plain title and description", () => {
    expect(all[3]).toMatchObject({
      title: "Old shape",
      description: "legacy text",
    });
  });
});
