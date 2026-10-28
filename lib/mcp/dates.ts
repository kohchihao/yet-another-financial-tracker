/** The app's reference time zone. Singapore has no DST, so a fixed offset is exact. */
const APP_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;

/** Today's date (YYYY-MM-DD) in the app's time zone. */
export function todayInAppTimeZone(now: Date = new Date()): string {
  return new Date(now.getTime() + APP_UTC_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * The inclusive start date for "the last N months", relative to `today`
 * (YYYY-MM-DD). The day of month is clamped, so 2026-08-31 minus 6 months is
 * 2026-02-28.
 */
export function monthsAgo(today: string, months: number): string {
  const [year, month, day] = today.split("-").map(Number);
  const totalMonths = year * 12 + (month - 1) - months;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = (totalMonths % 12) + 1;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  const targetDay = Math.min(day, lastDay);
  return [
    String(targetYear).padStart(4, "0"),
    String(targetMonth).padStart(2, "0"),
    String(targetDay).padStart(2, "0"),
  ].join("-");
}
