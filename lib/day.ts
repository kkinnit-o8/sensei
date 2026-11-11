/**
 * Study days. A study day runs from 04:00 local time to 04:00 the next day, so a late-night
 * session still counts for the day you started it. "Local" is the time zone of the computer
 * running the app. All functions take `now` so they can be tested.
 */

export const ROLLOVER_HOUR = 4;

const pad = (n: number) => String(n).padStart(2, "0");

function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseDay(day: string): { y: number; m: number; d: number } {
  const [y, m, d] = day.split("-").map(Number);
  return { y, m, d };
}

/** The study day a moment belongs to, as "YYYY-MM-DD". */
export function studyDay(now: Date): string {
  const d = new Date(now.getTime());
  // Use the local wall clock (not "now minus 4 hours") so DST changes don't shift the boundary.
  if (d.getHours() < ROLLOVER_HOUR) d.setDate(d.getDate() - 1);
  return ymd(d);
}

/** When a study day starts (04:00 local time). */
export function dayStart(day: string): Date {
  const { y, m, d } = parseDay(day);
  return new Date(y, m - 1, d, ROLLOVER_HOUR, 0, 0, 0);
}

/** When the study day containing `now` ends (the next 04:00). */
export function dayEnd(now: Date): Date {
  return dayStart(addDays(studyDay(now), 1));
}

export function addDays(day: string, n: number): string {
  const { y, m, d } = parseDay(day);
  // Noon avoids DST edge cases when stepping whole days.
  return ymd(new Date(y, m - 1, d + n, 12));
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  const pa = parseDay(a);
  const pb = parseDay(b);
  return Math.round((Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 86_400_000);
}

/**
 * Current streak: consecutive completed study days ending today, or ending yesterday if
 * today isn't finished yet (the streak isn't broken until today is over).
 */
export function streak(completedDays: Iterable<string>, today: string): number {
  const done = new Set(completedDays);
  let day = done.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (done.has(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

/** Longest run of consecutive completed days. */
export function longestStreak(completedDays: Iterable<string>): number {
  const days = [...new Set(completedDays)].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of days) {
    run = prev && daysBetween(prev, d) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}
