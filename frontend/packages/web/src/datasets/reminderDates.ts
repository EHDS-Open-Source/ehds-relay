// Dates for the revalidation reminder, as `YYYY-MM-DD` strings (what a date input holds and
// what the API takes). They are compared as strings, which sorts the same as the dates.

import {
  addDays,
  addYears,
  formatLongDate,
  isIsoDate,
  todayIso,
} from "@ehds-relay/ui";

/** The furthest ahead a reminder can be set, the same limit the API applies. */
export const REMINDER_MAX_YEARS_AHEAD = 5;

export { addYears, isIsoDate, todayIso };

/** The day after `iso`. */
export function nextDay(iso: string): string {
  return addDays(iso, 1);
}

/** What the date field starts with: the current date if it is still ahead, else a year from today. */
export function initialReminderDate(
  current: string | null | undefined,
  now: Date = new Date(),
): string {
  const today = todayIso(now);
  return current && current > today ? current : addYears(today, 1);
}

export type ReminderDateProblem =
  "required" | "invalid" | "notFuture" | "tooFar";

/** Why the date cannot be saved, or undefined if it can. */
export function reminderDateProblem(
  value: string,
  now: Date = new Date(),
): ReminderDateProblem | undefined {
  if (value.trim() === "") return "required";
  if (!isIsoDate(value)) return "invalid";
  const today = todayIso(now);
  if (value <= today) return "notFuture";
  if (value > addYears(today, REMINDER_MAX_YEARS_AHEAD)) return "tooFar";
  return undefined;
}

/** A `YYYY-MM-DD` date for people, with the month written out, e.g. "3 November 2027". */
export const formatIsoDate = formatLongDate;

/** Whether a reminder date is behind us: the day after the date, not on it. */
export function isReminderPassed(
  iso: string | null | undefined,
  now: Date = new Date(),
): boolean {
  return Boolean(iso && isIsoDate(iso) && iso < todayIso(now));
}
