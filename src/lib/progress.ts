/** Pure helpers over the curriculum: what a member has solved, and where they stand. */
import { RANK_KEYS, curriculum, type RankKey } from './curriculum';

export const rankIndex = (rank: RankKey) => RANK_KEYS.indexOf(rank);

export function nextRank(rank: RankKey): RankKey | null {
  return RANK_KEYS[rankIndex(rank) + 1] ?? null;
}

export function isRankKey(value: string): value is RankKey {
  return (RANK_KEYS as string[]).includes(value);
}

export type RankProgress = {
  rank: RankKey;
  solved: number;
  total: number;
  /** Slugs in this rank's set that are not solved yet, in curriculum order. */
  remaining: string[];
};

/** Progress inside one rank's problem set. `solved` is a set of problem slugs. */
export function rankProgress(rank: RankKey, solved: ReadonlySet<string>): RankProgress {
  const set = curriculum[rank];
  const remaining = set.filter((p) => !solved.has(p.slug)).map((p) => p.slug);
  return { rank, solved: set.length - remaining.length, total: set.length, remaining };
}

/** How many of the 250 have been solved. */
export function totalSolved(solved: ReadonlySet<string>): number {
  let n = 0;
  for (const key of RANK_KEYS) for (const p of curriculum[key]) if (solved.has(p.slug)) n++;
  return n;
}
