/**
 * Pace and streaks, computed in the member's own timezone (weeks run Monday to
 * Sunday, because that is how a club week works). Pure and dependency-free.
 * All inputs are unix seconds, the way LeetCode reports them.
 */

const DAY = 86_400_000;

/** Local midnight of the Monday that starts the week containing `ms`. */
export function weekStart(ms: number): number {
  const d = new Date(ms);
  const sinceMonday = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - sinceMonday).getTime();
}

/** The Monday `weeks` weeks before the given Monday. Calendar arithmetic, so daylight saving cannot skew it. */
function weeksBefore(monday: number, weeks: number): number {
  const d = new Date(monday);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7 * weeks).getTime();
}

export type Week = { start: number; count: number };

/** Solves per week for the last `weeks` weeks, oldest first. The last entry is the week in progress. */
export function weeklyCounts(times: readonly number[], nowMs: number, weeks = 12): Week[] {
  const thisWeek = weekStart(nowMs);
  const out: Week[] = [];
  for (let i = weeks - 1; i >= 0; i--) out.push({ start: weeksBefore(thisWeek, i), count: 0 });
  const byStart = new Map(out.map((w) => [w.start, w]));
  for (const t of times) {
    const w = byStart.get(weekStart(t * 1000));
    if (w) w.count++;
  }
  return out;
}

/**
 * Weeks in a row with at least one solve. The week in progress cannot have
 * failed yet, so if it is still empty the run is counted up to last week.
 */
export function streakWeeks(times: readonly number[], nowMs: number): number {
  const active = new Set(times.map((t) => weekStart(t * 1000)));
  let cursor = weekStart(nowMs);
  if (!active.has(cursor)) cursor = weeksBefore(cursor, 1);
  let run = 0;
  while (active.has(cursor)) {
    run++;
    cursor = weeksBefore(cursor, 1);
  }
  return run;
}

/** Days left in the club week, counting today (Monday: 7, Sunday: 1). */
export function daysLeftInWeek(nowMs: number): number {
  return 7 - ((new Date(nowMs).getDay() + 6) % 7);
}

/** "just now", "4 min ago", "3 h ago", "2 days ago", then a plain date. */
export function ago(thenMs: number, nowMs: number): string {
  const s = Math.max(0, Math.round((nowMs - thenMs) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 14) return `${d} ${d === 1 ? 'day' : 'days'} ago`;
  return new Date(thenMs).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Whole days between two moments, rounded down. */
export function daysBetween(fromMs: number, toMs: number): number {
  return Math.max(0, Math.floor((toMs - fromMs) / DAY));
}
