/** Pure placement rules: the window, and how passes turn into a starting rank. */
import { RANK_KEYS, type RankKey } from './curriculum';

export const PLACEMENT_MINUTES = 90;
/** Slack after the window closes, so a solve in the last seconds still counts. */
export const GRACE_SECONDS = 60;
export const COOLDOWN_DAYS = 30;
/** A member must have proven account ownership this recently to start. */
export const REVERIFY_MINUTES = 30;
/** Legend or higher gets flagged so an officer can optionally re-test live. */
export const FLAG_FROM: RankKey = 'legend';

/**
 * Is a LeetCode submission timestamp (epoch SECONDS) inside the placement window?
 * Judged by LeetCode's own timestamp, never by when we happened to poll.
 */
export function inWindow(tsSeconds: number, startedAtMs: number, endsAtMs: number): boolean {
  const ms = tsSeconds * 1000;
  return ms >= startedAtMs && ms <= endsAtMs + GRACE_SECONDS * 1000;
}

/**
 * `passed[i]` is whether tier i+1 was solved. Start rank = one above the number
 * of tiers passed consecutively from the bottom, capped at Ancient (index 3).
 * Divine is never awarded by placement.
 */
export function startRank(passed: readonly boolean[]): RankKey {
  let run = 0;
  while (run < passed.length && passed[run]) run++;
  return RANK_KEYS[Math.min(run, 3)];
}

export function shouldFlag(rank: RankKey): boolean {
  return RANK_KEYS.indexOf(rank) >= RANK_KEYS.indexOf(FLAG_FROM);
}
