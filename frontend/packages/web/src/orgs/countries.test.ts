import { describe, expect, it } from "vitest";

import { countryName, euCountryCodes } from "./countries";

describe("countries", () => {
  it("lists 27 states with a name each", () => {
    expect(new Set(euCountryCodes).size).toBe(27);
    for (const code of euCountryCodes) {
      expect(countryName(code)).not.toBe(code);
    }
  });

  it("uses EL for Greece and shows XX as Other", () => {
    expect(euCountryCodes).toContain("EL");
    expect(euCountryCodes).not.toContain("GR");
    expect(countryName("EL")).toBe("Greece");
    expect(countryName("XX")).toBe("Other");
  });

  it("falls back to the code itself", () => {
    expect(countryName("ZZ")).toBe("ZZ");
    expect(countryName(null)).toBe("");
  });
});
