import { format, addDays, addWeeks } from "date-fns";

/** returns the most recent Sunday (start of current week) at midnight UTC. */
export function getCurrentWeekStart(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const start = new Date(now);
  start.setDate(now.getDate() - dayOfWeek);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function weekToParam(weekStart: Date): string {
  return format(weekStart, "yyyy-MM-dd");
}

/**
 * Converts a date returned by Prisma for a DB `date` column to a YYYY-MM-DD param.
 * Prisma returns date-only columns as UTC midnight JS Dates, so we must read UTC
 * components rather than local time to avoid off-by-one-day errors in US timezones.
 */
export function dbDateToParam(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function paramToWeek(param: string): Date {
  const [year, month, day] = param.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/** returns the current week start + the next two weeks (3 total) */
export function getAvailableWeeks(): Date[] {
  const current = getCurrentWeekStart();
  return [current, addWeeks(current, 1), addWeeks(current, 2)];
}

export function formatWeekRange(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  if (weekStart.getFullYear() === weekEnd.getFullYear()) {
    return `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`;
  }
  return `${format(weekStart, "MMM d, yyyy")} – ${format(weekEnd, "MMM d, yyyy")}`;
}
