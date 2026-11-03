// Dates for the revalidation reminder, as `YYYY-MM-DD` strings (what a date input holds and
// what the API takes). They are compared as strings, which sorts the same as the dates.

/** The furthest ahead a reminder can be set, the same limit the API applies. */
export const REMINDER_MAX_YEARS_AHEAD = 5;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

/** Today in the browser's time zone. */
export function todayIso(now: Date = new Date()): string {
  return `${pad(now.getFullYear(), 4)}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Whether the string is a real calendar date, so 2027-02-30 is not. */
export function isIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number) as [number, number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

/** The same day `years` later; 29 February becomes 28 February. */
export function addYears(iso: string, years: number): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const next = `${pad(y + years, 4)}-${pad(m)}-${pad(d)}`;
  return isIsoDate(next) ? next : `${pad(y + years, 4)}-${pad(m)}-28`;
}

/** The day after `iso`. */
export function nextDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
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

const longDate = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeZone: "UTC",
});

/** A `YYYY-MM-DD` date for people, e.g. "3 Nov 2027". */
export function formatIsoDate(iso: string): string {
  return isIsoDate(iso) ? longDate.format(new Date(`${iso}T00:00:00Z`)) : iso;
}
