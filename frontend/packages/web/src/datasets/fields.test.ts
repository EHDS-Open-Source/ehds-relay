import { zDatasetMetadata } from "@ehds-relay/api-client";
import { describe, expect, it } from "vitest";

import { shellMessages } from "../shell/messages";
import {
  datasetSections,
  fieldAnchorId,
  fieldKeys,
  fieldLabel,
  sectionOf,
} from "./fields";

describe("dataset fields", () => {
  it("lists every metadata field of the API exactly once", () => {
    // Fails when the backend adds or renames a field the form does not know about
    expect([...fieldKeys].sort()).toEqual(
      Object.keys(zDatasetMetadata.shape).sort(),
    );
    expect(new Set(fieldKeys).size).toBe(fieldKeys.length);
  });

  it("has the 27 EU fields plus the QUANTUM label, in six sections", () => {
    expect(fieldKeys).toHaveLength(28);
    expect(datasetSections.map((s) => s.title)).toEqual([
      "Main",
      "Access and governance",
      "Coverage and content",
      "Organisations",
      "Technical and contact information",
      "QUANTUM DQ&U label",
    ]);
    expect(sectionOf("publisher")).toBe("organisations");
  });

  it("names fields and nested parts from missing_for_publish", () => {
    expect(fieldLabel("keyword")).toBe("Keywords");
    expect(fieldLabel("publisher.contact_point")).toBe(
      `Publisher: ${shellMessages.datasetForm.contactPointOf}`,
    );
    expect(fieldAnchorId("title")).toBe("field-title");
    expect(fieldAnchorId("publisher.contact_point")).toBe(
      "field-publisher-contact_point",
    );
  });
});
