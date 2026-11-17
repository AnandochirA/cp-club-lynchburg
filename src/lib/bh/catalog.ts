/**
 * The catalog as a whole: which signal areas it covers, and which story to
 * pick for a question. Selection follows the book's order: Scope, then
 * Relevance, then Uniqueness (weighted more as the interview goes on), then
 * Recency.
 */
import { durationRank } from './levels';
import { SIGNAL_KEYS, type SignalKey, signalByKey } from './signals';
import { ageMonths, type Story } from './story';

type Slim = Pick<Story, 'id' | 'title' | 'tier' | 'signals' | 'scale' | 'when'>;

export type Coverage = {
  by: Record<SignalKey, { core: number[]; supporting: number[] }>;
  covered: SignalKey[];
  gaps: SignalKey[];
  /** A story that is the only one covering three or more areas: lose it and the catalog falls apart. */
  leaned: { id: number; title: string; areas: SignalKey[] } | null;
};

export function coverage(stories: Slim[]): Coverage {
  const by = Object.fromEntries(SIGNAL_KEYS.map((k) => [k, { core: [] as number[], supporting: [] as number[] }])) as Coverage['by'];
  for (const s of stories) for (const k of s.signals) by[k][s.tier === 'core' ? 'core' : 'supporting'].push(s.id);
  const covered = SIGNAL_KEYS.filter((k) => by[k].core.length + by[k].supporting.length > 0);
  let leaned: Coverage['leaned'] = null;
  for (const s of stories) {
    const solo = s.signals.filter((k) => by[k].core.length + by[k].supporting.length === 1);
    if (solo.length >= 3 && (!leaned || solo.length > leaned.areas.length)) leaned = { id: s.id, title: s.title, areas: solo };
  }
  return { by, covered, gaps: SIGNAL_KEYS.filter((k) => !covered.includes(k)), leaned };
}

/** 0–10: how big the story is. */
export function scopeScore(s: Slim): number {
  const sc = s.scale;
  const raw =
    durationRank(sc.duration) * 2 + Math.min(4, Math.log2(sc.people + 1)) + Math.min(5, sc.teams) + sc.contribution + sc.impact + (s.tier === 'core' ? 1.5 : 0);
  return Math.round((Math.min(26.5, raw) / 26.5) * 100) / 10;
}

export type Ranked = { story: Slim; score: number; relevance: number; scope: number; fresh: boolean; recency: number; reasons: string[] };

/**
 * Rank the catalog for one question. `used` counts how often each story was
 * already told in this interview; `nth` is the question's position (0-based),
 * so uniqueness weighs more as the interview goes on.
 */
export function rankStories(qSignals: SignalKey[], stories: Slim[], used: ReadonlyMap<number, number>, nth: number, now: Date): Ranked[] {
  return stories
    .map((s) => {
      const overlap = qSignals.filter((k) => s.signals.includes(k));
      const relevance = qSignals.length ? overlap.length / qSignals.length : 0;
      const scope = scopeScore(s);
      const fresh = !used.get(s.id);
      const age = ageMonths(s.when, now);
      const recency = age === null ? 0.4 : Math.max(0, 1 - age / 60);
      const score = scope + relevance * 7 + (fresh ? 1 + nth * 0.6 : 0) + recency * 2 - (relevance === 0 ? 20 : 0);
      const reasons: string[] = [];
      if (overlap.length) reasons.push(`Shows ${overlap.map((k) => signalByKey(k).title).join(' + ')}`);
      else reasons.push('Does not show what this question scores');
      reasons.push(scope >= 6 ? 'Large scope' : scope >= 3 ? 'Medium scope' : 'Small scope (or scale not filled in)');
      if (!fresh) reasons.push('Already told in this interview');
      else if (nth > 0) reasons.push('Not told yet: new ground');
      if (age !== null) reasons.push(age <= 12 ? 'Recent' : `${Math.round(age / 12)}y old`);
      return { story: s, score, relevance, scope, fresh, recency, reasons };
    })
    .sort((a, b) => b.score - a.score);
}

export type Verdict = { grade: 'best' | 'close' | 'better' | 'none'; top: Ranked | null; note: string };

/** How the member's pick compares with the ranker's. */
export function judgeSelection(chosenId: number | null, ranked: Ranked[]): Verdict {
  const top = ranked[0] ?? null;
  if (!top || top.relevance === 0) return { grade: 'none', top: null, note: 'Nothing in your catalog shows this signal area yet. Mine a story for it.' };
  if (chosenId === null) return { grade: 'better', top, note: `You had something: “${top.story.title}”.` };
  const mine = ranked.find((r) => r.story.id === chosenId);
  if (!mine) return { grade: 'better', top, note: `Try “${top.story.title}”.` };
  if (mine.story.id === top.story.id) return { grade: 'best', top, note: 'Same pick as the ranker.' };
  if (top.score - mine.score <= 1.5) return { grade: 'close', top, note: `Close call with “${top.story.title}”.` };
  return { grade: 'better', top, note: `“${top.story.title}” is stronger here: ${top.reasons.slice(0, 2).join(', ').toLowerCase()}.` };
}

/** Favorite project: impact × scope × personal contribution, with contribution breaking ties. */
export function favoriteRanking(stories: Slim[]) {
  const pool = stories.some((s) => s.tier === 'core') ? stories.filter((s) => s.tier === 'core') : stories;
  return pool
    .map((s) => {
      const c = s.scale.contribution || 1;
      const i = s.scale.impact || 1;
      const sc = Math.max(1, scopeScore(s));
      return { story: s, score: Math.round(c * i * sc * 10) / 10, contribution: c };
    })
    .sort((a, b) => b.score - a.score || b.contribution - a.contribution);
}
