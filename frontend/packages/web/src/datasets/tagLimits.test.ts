import { describe, expect, it } from "vitest";

import { KEYWORD_LIMITS, tagLimits } from "./tagLimits";

describe("tag limits", () => {
  it("match the server rule for keywords", () => {
    expect(KEYWORD_LIMITS).toEqual({ maxLength: 50, maxTags: 20 });
  });

  it("apply to keywords only", () => {
    expect(tagLimits("keyword")).toEqual(KEYWORD_LIMITS);
    expect(tagLimits("code_values")).toEqual({});
    expect(tagLimits("identifier")).toEqual({});
  });
});
