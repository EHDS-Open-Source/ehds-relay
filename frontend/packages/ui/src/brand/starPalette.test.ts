import { describe, expect, it } from "vitest";

import { STAR_PALETTE, starColour, starIndexFromId } from "./starPalette";

describe("starColour", () => {
  it("is stable for the same position", () => {
    expect(starColour(3)).toBe(starColour(3));
    expect(starColour(0)).toBe("#E3A6E4");
  });

  it("wraps after the last colour", () => {
    expect(STAR_PALETTE).toHaveLength(10);
    expect(starColour(10)).toBe(starColour(0));
    expect(starColour(13)).toBe(starColour(3));
  });

  it("gives neighbours different colours", () => {
    for (let i = 0; i < 25; i += 1) {
      expect(starColour(i)).not.toBe(starColour(i + 1));
    }
  });

  it("handles negative and odd positions", () => {
    expect(starColour(-1)).toBe(starColour(9));
    expect(starColour(Number.NaN)).toBe(starColour(0));
  });
});

describe("starIndexFromId", () => {
  it("is stable and within the palette", () => {
    const i = starIndexFromId("0f6c-example");
    expect(i).toBe(starIndexFromId("0f6c-example"));
    expect(i).toBeGreaterThanOrEqual(0);
    expect(i).toBeLessThan(STAR_PALETTE.length);
  });
});
