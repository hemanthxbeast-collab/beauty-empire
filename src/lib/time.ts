import { TZDate, tz as tzContext } from "@date-fns/tz";
import { format } from "date-fns";

export const DEFAULT_TIMEZONE = process.env.SALON_TIMEZONE || "Asia/Kolkata";

/** "YYYY-MM-DD" calendar date in the given timezone. */
export function dateKeyInTz(date: Date, timeZone = DEFAULT_TIMEZONE): string {
  return format(date, "yyyy-MM-dd", { in: tzContext(timeZone) });
}

export function parseDateKey(dateKey: string): { y: number; m: number; d: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) throw new Error("Invalid date key");
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

export function isValidDateKey(dateKey: string): boolean {
  try {
    const { y, m, d } = parseDateKey(dateKey);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  } catch {
    return false;
  }
}

/** Day of week (0 = Sunday) for a calendar date — independent of timezone. */
export function dayOfWeekForDateKey(dateKey: string): number {
  const { y, m, d } = parseDateKey(dateKey);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** The UTC instant for a wall-clock time (minutes from midnight) on a date in a timezone. */
export function zonedToUtc(dateKey: string, minuteOfDay: number, timeZone = DEFAULT_TIMEZONE): Date {
  const { y, m, d } = parseDateKey(dateKey);
  const h = Math.floor(minuteOfDay / 60);
  const min = minuteOfDay % 60;
  return new Date(new TZDate(y, m - 1, d, h, min, 0, timeZone).getTime());
}

/** Minutes from midnight of an instant in a timezone. */
export function minuteOfDayInTz(date: Date, timeZone = DEFAULT_TIMEZONE): number {
  const zoned = new TZDate(date.getTime(), timeZone);
  return zoned.getHours() * 60 + zoned.getMinutes();
}

/** UTC Date at midnight for a date key — used for @db.Date columns. */
export function dateKeyToDbDate(dateKey: string): Date {
  const { y, m, d } = parseDateKey(dateKey);
  return new Date(Date.UTC(y, m - 1, d));
}

export function dbDateToDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const { y, m, d } = parseDateKey(dateKey);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function formatInTz(date: Date, pattern: string, timeZone = DEFAULT_TIMEZONE): string {
  return format(date, pattern, { in: tzContext(timeZone) });
}

export function formatMinuteOfDay(minuteOfDay: number): string {
  const h = Math.floor(minuteOfDay / 60);
  const m = minuteOfDay % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${suffix}`;
}

export function minutesToHHMM(minuteOfDay: number): string {
  return `${Math.floor(minuteOfDay / 60).toString().padStart(2, "0")}:${(minuteOfDay % 60).toString().padStart(2, "0")}`;
}

export function hhmmToMinutes(value: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) throw new Error("Invalid time");
  return Number(match[1]) * 60 + Number(match[2]);
}

/** True once an instant is in the past (evaluated at request time on the server). */
export function hasStarted(instant: Date): boolean {
  return instant.getTime() <= Date.now();
}
