import { describe, expect, it } from "vitest";

import {
  addDays,
  addMonths,
  addYears,
  clampIso,
  endOfWeek,
  formatLongDate,
  formatMonthYear,
  isIsoDate,
  isWithin,
  monthGrid,
  startOfWeek,
  todayIso,
  weekdayNames,
} from "./isoDate";

describe("isoDate", () => {
  it("builds Monday-first grids padded with the neighbouring months", () => {
    // November 2026 starts on a Sunday, so the first row begins the Monday before
    const nov = monthGrid("2026-11-15");
    expect(nov[0]![0]).toBe("2026-10-26");
    expect(nov[0]![6]).toBe("2026-11-01");
    expect(nov.at(-1)![6]).toBe("2026-12-06");
    expect(nov.every((week) => week.length === 7)).toBe(true);
    // February 2027 starts on a Monday and fits four rows
    const feb = monthGrid("2027-02-10");
    expect(feb).toHaveLength(4);
    expect(feb[0]![0]).toBe("2027-02-01");
    expect(feb[3]![6]).toBe("2027-02-28");
  });

  it("clamps the day when a month is shorter", () => {
    expect(addMonths("2027-01-31", 1)).toBe("2027-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonths("2027-01-15", -1)).toBe("2026-12-15");
    expect(addMonths("2027-12-31", 2)).toBe("2028-02-29");
  });

  it("moves years, turning 29 February into 28 February", () => {
    expect(addYears("2028-02-29", 1)).toBe("2029-02-28");
    expect(addYears("2028-02-29", 4)).toBe("2032-02-29");
    expect(addYears("2027-10-22", -1)).toBe("2026-10-22");
  });

  it("finds the Monday and Sunday of a week", () => {
    expect(startOfWeek("2026-11-06")).toBe("2026-11-02"); // a Friday
    expect(startOfWeek("2026-11-02")).toBe("2026-11-02");
    expect(startOfWeek("2026-11-08")).toBe("2026-11-02"); // a Sunday
    expect(endOfWeek("2026-11-06")).toBe("2026-11-08");
    expect(endOfWeek("2026-11-09")).toBe("2026-11-15");
  });

  it("adds days across month and year ends", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-03-01", -1)).toBe("2027-02-28");
  });

  it("checks limits and clamps to them", () => {
    expect(isWithin("2027-01-05", "2027-01-05", "2027-01-10")).toBe(true);
    expect(isWithin("2027-01-04", "2027-01-05")).toBe(false);
    expect(isWithin("2027-01-11", undefined, "2027-01-10")).toBe(false);
    expect(isWithin("2027-01-11")).toBe(true);
    expect(clampIso("2027-01-01", "2027-01-05", "2027-01-10")).toBe(
      "2027-01-05",
    );
    expect(clampIso("2027-02-01", "2027-01-05", "2027-01-10")).toBe(
      "2027-01-10",
    );
    expect(clampIso("2027-01-07", "2027-01-05", "2027-01-10")).toBe(
      "2027-01-07",
    );
  });

  it("writes dates for people", () => {
    expect(formatLongDate("2027-10-22")).toBe("22 October 2027");
    expect(formatLongDate("not a date")).toBe("not a date");
    expect(formatMonthYear("2027-10-22")).toBe("October 2027");
    expect(weekdayNames().map((d) => d.long)).toEqual([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ]);
  });

  it("validates real dates only", () => {
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("2027-02-29")).toBe(false);
    expect(isIsoDate("2027-2-1")).toBe(false);
  });

  it("does not depend on the time zone", () => {
    // Local midnight is a different UTC day in most zones; the string must not move
    const local = new Date(2027, 2, 28, 0, 30);
    expect(todayIso(local)).toBe("2027-03-28");
    expect(addDays("2027-03-28", 1)).toBe("2027-03-29");
    expect(formatLongDate("2027-03-28")).toBe("28 March 2027");
  });
});
