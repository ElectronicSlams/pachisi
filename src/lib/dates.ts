/**
 * Stadium date grammar (brief §13.4): British day-month-year with no ordinal,
 * relative wording for anything under 30 days, the absolute date always
 * available for hover and detail. Every formatter takes `now` so server and
 * client render the same words for the same instant.
 */

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const RELATIVE_WINDOW_MS = 30 * DAY_MS;

const absoluteFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const monthYearFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export type StadiumDate = {
  /** What the surface prints: "3h ago", "today", "26 Jun 2026". */
  readonly label: string;
  /** The absolute British date, for `title` and detail rows. */
  readonly absolute: string;
  /** ISO 8601 instant for `<time dateTime>`. */
  readonly iso: string;
  readonly relative: boolean;
};

export function toTimestamp(value: string | number | Date): number | null {
  const timestamp = value instanceof Date ? value.getTime() : typeof value === "number" ? value : Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

/** "26 Jun 2026". Dates print in UTC so a match never moves day between server and browser. */
export function formatAbsoluteDate(value: string | number | Date): string {
  const timestamp = toTimestamp(value);
  return timestamp === null ? "" : absoluteFormatter.format(timestamp);
}

/** "Mar 2025", used for "member since". */
export function formatMonthYear(value: string | number | Date): string {
  const timestamp = toTimestamp(value);
  return timestamp === null ? "" : monthYearFormatter.format(timestamp);
}

export function formatStadiumDate(value: string | number | Date, now: number = Date.now()): StadiumDate | null {
  const timestamp = toTimestamp(value);
  if (timestamp === null) return null;
  const absolute = absoluteFormatter.format(timestamp);
  const iso = new Date(timestamp).toISOString();
  const age = now - timestamp;
  if (age < 0 || age >= RELATIVE_WINDOW_MS) return { label: absolute, absolute, iso, relative: false };
  if (age < MINUTE_MS) return { label: "just now", absolute, iso, relative: true };
  if (age < HOUR_MS) return { label: `${Math.floor(age / MINUTE_MS)}m ago`, absolute, iso, relative: true };
  if (age < DAY_MS) return { label: `${Math.floor(age / HOUR_MS)}h ago`, absolute, iso, relative: true };
  return { label: `${Math.floor(age / DAY_MS)}d ago`, absolute, iso, relative: true };
}

/** True when the newest instant is older than one calendar day: the slate is "old". */
export function isOlderThanOneDay(value: string | number | Date, now: number = Date.now()): boolean {
  const timestamp = toTimestamp(value);
  return timestamp === null || now - timestamp >= DAY_MS;
}

export function newestTimestamp(values: ReadonlyArray<string | number | Date>): number | null {
  let newest: number | null = null;
  for (const value of values) {
    const timestamp = toTimestamp(value);
    if (timestamp !== null && (newest === null || timestamp > newest)) newest = timestamp;
  }
  return newest;
}
