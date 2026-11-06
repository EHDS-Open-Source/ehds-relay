// Calendar dates as `YYYY-MM-DD` strings (what the API takes). They sort the same as the
// dates, and all arithmetic is done in UTC so no time zone can move a day.

/** The locale dates are written in for people. One place to change for a translation. */
export const DATE_LOCALE = "en-GB";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

function fromParts(y: number, m: number, d: number): string {
  return `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
}

function parts(iso: string): [number, number, number] {
  return iso.split("-").map(Number) as [number, number, number];
}

function toDate(iso: string): Date {
  const [y, m, d] = parts(iso);
  const date = new Date(Date.UTC(2000, m - 1, d));
  date.setUTCFullYear(y);
  return date;
}

function fromDate(date: Date): string {
  return fromParts(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
}

/** Today in the browser's time zone. */
export function todayIso(now: Date = new Date()): string {
  return fromParts(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** Whether the string is a real calendar date, so 2027-02-30 is not. */
export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  return fromDate(toDate(value)) === value;
}

function daysInMonth(y: number, m: number): number {
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  return m === 2 ? (leap ? 29 : 28) : [4, 6, 9, 11].includes(m) ? 30 : 31;
}

/** `iso` moved by whole days. */
export function addDays(iso: string, days: number): string {
  const date = toDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return fromDate(date);
}

/** `iso` moved by whole months; a day that does not exist there becomes the last day (31 Jan + 1 = 28 Feb). */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = parts(iso);
  const index = y * 12 + (m - 1) + months;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return fromParts(year, month, Math.min(d, daysInMonth(year, month)));
}

/** The same day `years` later; 29 February becomes 28 February. */
export function addYears(iso: string, years: number): string {
  return addMonths(iso, years * 12);
}

/** The Monday of the week containing `iso`. Weeks start on Monday. */
export function startOfWeek(iso: string): string {
  const day = toDate(iso).getUTCDay(); // 0 is Sunday
  return addDays(iso, -((day + 6) % 7));
}

/** The Sunday of the week containing `iso`. */
export function endOfWeek(iso: string): string {
  return addDays(startOfWeek(iso), 6);
}

/** The first day of the month containing `iso`. */
export function startOfMonth(iso: string): string {
  const [y, m] = parts(iso);
  return fromParts(y, m, 1);
}

/** The last day of the month containing `iso`. */
export function endOfMonth(iso: string): string {
  const [y, m] = parts(iso);
  return fromParts(y, m, daysInMonth(y, m));
}

/** Whether both are in the same month of the same year. */
export function sameMonth(a: string, b: string): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

/** The weeks shown for the month containing `iso`: Monday-first rows of seven days, padded with the neighbouring months. */
export function monthGrid(iso: string): string[][] {
  const weeks: string[][] = [];
  const last = endOfWeek(endOfMonth(iso));
  for (
    let start = startOfWeek(startOfMonth(iso));
    start <= last;
    start = addDays(start, 7)
  ) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(start, i)));
  }
  return weeks;
}

/** Whether `iso` is inside the optional limits (both ends included). */
export function isWithin(iso: string, min?: string, max?: string): boolean {
  return (!min || iso >= min) && (!max || iso <= max);
}

/** `iso` moved to the nearest allowed day. */
export function clampIso(iso: string, min?: string, max?: string): string {
  if (min && iso < min) return min;
  if (max && iso > max) return max;
  return iso;
}

const formatter = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(DATE_LOCALE, { ...options, timeZone: "UTC" });

const longDate = formatter({ day: "numeric", month: "long", year: "numeric" });
const monthYear = formatter({ month: "long", year: "numeric" });
const weekdayLong = formatter({ weekday: "long" });
const weekdayNarrow = formatter({ weekday: "narrow" });

/** A date for people with the month written out, e.g. "22 October 2027". */
export function formatLongDate(iso: string): string {
  return isIsoDate(iso) ? longDate.format(toDate(iso)) : iso;
}

/** The month and year of `iso`, e.g. "October 2027". */
export function formatMonthYear(iso: string): string {
  return monthYear.format(toDate(iso));
}

/** Monday to Sunday: the full name (for screen readers) and the initial (shown). */
export function weekdayNames(): { long: string; narrow: string }[] {
  // 2001-01-01 was a Monday
  return Array.from({ length: 7 }, (_, i) => {
    const day = toDate(addDays("2001-01-01", i));
    return { long: weekdayLong.format(day), narrow: weekdayNarrow.format(day) };
  });
}
