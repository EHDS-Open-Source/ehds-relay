import { describe, expect, it } from "vitest";

import {
  addYears,
  formatIsoDate,
  initialReminderDate,
  isIsoDate,
  nextDay,
  reminderDateProblem,
  todayIso,
} from "./reminderDates";

// 3 November 2026, mid-morning local time
const now = new Date(2026, 10, 3, 10, 0);

describe("reminder dates", () => {
  it("reads today in local time", () => {
    expect(todayIso(now)).toBe("2026-11-03");
    expect(todayIso(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });

  it("adds years, moving 29 February to 28 February", () => {
    expect(addYears("2026-11-03", 1)).toBe("2027-11-03");
    expect(addYears("2028-02-29", 1)).toBe("2029-02-28");
    expect(addYears("2028-02-29", 4)).toBe("2032-02-29");
  });

  it("finds the next day across month and year ends", () => {
    expect(nextDay("2026-11-30")).toBe("2026-12-01");
    expect(nextDay("2026-12-31")).toBe("2027-01-01");
  });

  it("checks for real calendar dates", () => {
    expect(isIsoDate("2027-02-28")).toBe(true);
    expect(isIsoDate("2027-02-30")).toBe(false);
    expect(isIsoDate("27-02-01")).toBe(false);
    expect(isIsoDate("")).toBe(false);
  });

  it("ADD-12 pre-fills one year ahead, or keeps a date still ahead", () => {
    expect(initialReminderDate(null, now)).toBe("2027-11-03");
    expect(initialReminderDate("2027-01-15", now)).toBe("2027-01-15");
    // A date that has passed is replaced by a fresh one
    expect(initialReminderDate("2026-11-03", now)).toBe("2027-11-03");
    expect(initialReminderDate("2025-06-01", now)).toBe("2027-11-03");
  });

  it("EDIT-11 only accepts dates after today and up to five years ahead", () => {
    expect(reminderDateProblem("", now)).toBe("required");
    expect(reminderDateProblem("2027-13-01", now)).toBe("invalid");
    expect(reminderDateProblem("2026-11-02", now)).toBe("notFuture");
    expect(reminderDateProblem("2026-11-03", now)).toBe("notFuture");
    expect(reminderDateProblem("2026-11-04", now)).toBeUndefined();
    expect(reminderDateProblem("2031-11-03", now)).toBeUndefined();
    expect(reminderDateProblem("2031-11-04", now)).toBe("tooFar");
  });

  it("formats dates for people", () => {
    expect(formatIsoDate("2027-11-03")).toBe("3 Nov 2027");
    expect(formatIsoDate("nonsense")).toBe("nonsense");
  });
});
