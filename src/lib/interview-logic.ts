/**
 * Pure rules for interview mode, shared by the browser and the server (like
 * chat-rules.ts): the shape of a session's draft, its size limits, and the
 * talk stats. The server never trusts a draft as sent; it runs cleanDraft.
 */
import { RANK_KEYS, curriculum, type Problem } from './curriculum';
import { STAGE_IDS, patternMatches, type ScoreKey, type StageId } from './interview-kit';

export const MAX_NOTES = 2000;
export const MAX_LINE = 400;
/** Total characters of transcript kept. About 45 minutes of steady talking. */
export const MAX_TRANSCRIPT_CHARS = 32_000;
export const MAX_BODY_BYTES = 64_000;
export const STARTS_PER_DAY = 10;
/** An unfinished session younger than this is offered for resuming. */
export const RESUME_HOURS = 6;
/** Gaps between recognised words shorter than this count as talking. */
export const TALK_GAP_MS = 2500;
export const NUDGE_AFTER_MS = 30_000;
export const MAX_NUDGES_PER_STAGE = 4;
/** The follow-up question comes once this share of the stage budget has passed. */
export const FOLLOW_UP_AT = 0.55;
const MAX_STAGE_MS = 6 * 60 * 60_000;

export type StageState = {
  notes: string;
  /** Indices into the stage's checklist. */
  checked: number[];
  /** Time spent on this stage. */
  ms: number;
  /** Of that, time spent talking (only counted while the mic is on). */
  talkMs: number;
  longestSilenceMs: number;
  nudges: number;
  /** The follow-up picked for this stage, and whether it has been asked. */
  followUp: string;
  asked: boolean;
  done: boolean;
  skipped: boolean;
};

export type Line = { stage: StageId; who: 'you' | 'coach'; text: string; /** ms since the session started */ at: number };

export type Draft = {
  stage: StageId | 'review';
  stages: Record<StageId, StageState>;
  transcript: Line[];
  /** True once the mic has been on at all; talk stats mean nothing otherwise. */
  mic: boolean;
  extras: Extras;
};

/** Blind mode's pattern call, and the curveball (empty when this round has none). */
export type Extras = { pattern: string; curveball: string; curveAsked: boolean; curveAnswer: string };
export const emptyExtras = (): Extras => ({ pattern: '', curveball: '', curveAsked: false, curveAnswer: '' });

export type Scores = Record<ScoreKey, number>;

export type TalkStats = {
  mic: boolean;
  totalMs: number;
  talkMs: number;
  /** 0..1 */
  talkRatio: number;
  longestSilenceMs: number;
  nudges: number;
  skipped: StageId[];
};

export const SCORE_KEYS: ScoreKey[] = ['communication', 'problemSolving', 'coding', 'verification'];

/** practice: everything shown. blind: drawn for you, topic hidden, no skipping. redo: a spaced-repetition retry. */
export type Mode = 'practice' | 'blind' | 'redo';
export const MODES: Mode[] = ['practice', 'blind', 'redo'];

/** What went wrong, tagged after the round. Labels live in interview-kit.ts. */
export const MISTAKE_KEYS = [
  'wrong_pattern',
  'misread',
  'missed_edge',
  'off_by_one',
  'bug',
  'out_of_time',
  'no_optimize',
  'froze',
] as const;
export type MistakeKey = (typeof MISTAKE_KEYS)[number];
export const MAX_NEXT_TIME = 200;

export function cleanMistakes(raw: unknown): MistakeKey[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((m): m is MistakeKey => (MISTAKE_KEYS as readonly string[]).includes(m as string)))];
}

// --------------------------------------------------------- transcript signals

/** Read off the transcript at finish. Null fields mean "never happened". */
export type Metrics = {
  words: number;
  /** When you first floated an idea or a complexity, ms since the start. */
  firstIdeaMs: number | null;
  /** Words per minute of talking. */
  wpm: number;
  fillersPerMin: number;
  complexityInApproach: boolean;
  complexityInTest: boolean;
  codeSilenceMs: number;
};

const IDEA = /brute force|naive|\bo\s*\(|\bo of\b|big o|n log n|n squared|\blinear\b|quadratic|we could|i would|i'd use|my approach|the idea is/i;
const COMPLEXITY = /\bo\s*\(|\bo of\b|big o|log n|n squared|\blinear\b|quadratic|constant (time|space)|exponential|time complexity|space complexity/i;
/** Chrome's recogniser drops most "um"s and "uh"s, so this mostly catches the verbal ones. */
const FILLER = /\b(um+|uh+|erm|like|basically|actually|literally|you know|kind of|sort of|i guess|so yeah)\b/gi;

export const wordCount = (s: string) => (s.match(/\S+/g) ?? []).length;
export const fillerCount = (s: string) => s.match(FILLER)?.length ?? 0;

export function transcriptMetrics(d: Draft): Metrics | null {
  if (!d.mic) return null;
  const mine = d.transcript.filter((l) => l.who === 'you');
  const words = mine.reduce((n, l) => n + wordCount(l.text), 0);
  const talkMin = STAGE_IDS.reduce((n, id) => n + Math.min(d.stages[id].talkMs, d.stages[id].ms), 0) / 60_000;
  const fillers = mine.reduce((n, l) => n + (l.text.match(FILLER)?.length ?? 0), 0);
  return {
    words,
    firstIdeaMs: mine.find((l) => IDEA.test(l.text))?.at ?? null,
    wpm: talkMin >= 0.5 ? Math.round(words / talkMin) : 0,
    fillersPerMin: talkMin >= 0.5 ? Math.round((fillers / talkMin) * 10) / 10 : 0,
    complexityInApproach: mine.some((l) => l.stage === 'approach' && COMPLEXITY.test(l.text)),
    complexityInTest: mine.some((l) => l.stage === 'test' && COMPLEXITY.test(l.text)),
    codeSilenceMs: d.stages.code.longestSilenceMs,
  };
}

export type Grade = 'good' | 'ok' | 'bad';
export type Signal = { key: string; label: string; value: string; target: string; grade: Grade };

/** The five signals, each with the range a strong candidate lands in. */
export function signals(m: Metrics): Signal[] {
  const idea = m.firstIdeaMs;
  const both = m.complexityInApproach && m.complexityInTest;
  const either = m.complexityInApproach || m.complexityInTest;
  return [
    {
      key: 'idea',
      label: 'First idea out loud',
      value: idea === null ? 'never' : clock(idea),
      target: 'by 12:00',
      grade: idea === null ? 'bad' : idea <= 12 * 60_000 ? 'good' : idea <= 16 * 60_000 ? 'ok' : 'bad',
    },
    {
      key: 'wpm',
      label: 'Pace',
      value: m.wpm ? `${m.wpm} wpm` : '–',
      target: '110–170 wpm',
      grade: m.wpm >= 110 && m.wpm <= 170 ? 'good' : m.wpm >= 90 && m.wpm <= 190 ? 'ok' : 'bad',
    },
    {
      key: 'fillers',
      label: 'Filler words',
      value: `${m.fillersPerMin}/min`,
      target: '3/min or fewer',
      grade: m.fillersPerMin <= 3 ? 'good' : m.fillersPerMin <= 6 ? 'ok' : 'bad',
    },
    {
      key: 'complexity',
      label: 'Said the complexity',
      value: both ? 'approach + test' : m.complexityInApproach ? 'approach only' : m.complexityInTest ? 'test only' : 'never',
      target: 'in approach and test',
      grade: both ? 'good' : either ? 'ok' : 'bad',
    },
    {
      key: 'silence',
      label: 'Longest silence coding',
      value: clock(m.codeSilenceMs),
      target: '0:30 or less',
      grade: m.codeSilenceMs <= 30_000 ? 'good' : m.codeSilenceMs <= 60_000 ? 'ok' : 'bad',
    },
  ];
}

// -------------------------------------------------------------------- verdict

export type Verdict = 'strong' | 'lean_hire' | 'lean_no' | 'no_hire';

export const scored = (s: Scores | null | undefined): s is Scores => !!s && SCORE_KEYS.every((k) => s[k] >= 1);
export const avgScore = (s: Scores) => SCORE_KEYS.reduce((n, k) => n + s[k], 0) / SCORE_KEYS.length;

/** The overall call a hiring committee would write down, from the four self-scores. */
export function verdictOf(s: Scores | null | undefined): Verdict | null {
  if (!scored(s)) return null;
  const a = avgScore(s);
  return a >= 3.5 ? 'strong' : a >= 2.75 ? 'lean_hire' : a >= 2 ? 'lean_no' : 'no_hire';
}

export function findProblem(slug: string): Problem | null {
  for (const key of RANK_KEYS) {
    const p = curriculum[key].find((x) => x.slug === slug);
    if (p) return p;
  }
  return null;
}

export function emptyStage(): StageState {
  return { notes: '', checked: [], ms: 0, talkMs: 0, longestSilenceMs: 0, nudges: 0, followUp: '', asked: false, done: false, skipped: false };
}

export function emptyDraft(): Draft {
  return {
    stage: 'read',
    stages: Object.fromEntries(STAGE_IDS.map((id) => [id, emptyStage()])) as Record<StageId, StageState>,
    transcript: [],
    mic: false,
    extras: emptyExtras(),
  };
}

export function cleanExtras(raw: unknown): Extras {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    pattern: text(r.pattern, 80),
    curveball: text(r.curveball, MAX_LINE),
    curveAsked: r.curveAsked === true,
    curveAnswer: text(r.curveAnswer, MAX_NOTES),
  };
}

export const transcriptChars = (lines: Line[]) => lines.reduce((n, l) => n + l.text.length, 0);

const isStage = (v: unknown): v is StageId => typeof v === 'string' && (STAGE_IDS as string[]).includes(v);
const num = (v: unknown, max: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(0, Math.round(v))) : 0);
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

/** A draft as the client sent it, reduced to exactly the fields we keep. Null if it is not a draft at all. */
export function cleanDraft(raw: unknown): Draft | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const stage = r.stage === 'review' || isStage(r.stage) ? (r.stage as Draft['stage']) : null;
  if (!stage || !r.stages || typeof r.stages !== 'object' || !Array.isArray(r.transcript)) return null;

  const out = emptyDraft();
  out.stage = stage;
  out.mic = r.mic === true;
  out.extras = cleanExtras(r.extras);
  for (const id of STAGE_IDS) {
    const s = (r.stages as Record<string, unknown>)[id];
    if (!s || typeof s !== 'object') continue;
    const v = s as Record<string, unknown>;
    out.stages[id] = {
      notes: text(v.notes, MAX_NOTES),
      checked: Array.isArray(v.checked) ? [...new Set(v.checked.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < 20))] : [],
      ms: num(v.ms, MAX_STAGE_MS),
      talkMs: num(v.talkMs, MAX_STAGE_MS),
      longestSilenceMs: num(v.longestSilenceMs, MAX_STAGE_MS),
      nudges: num(v.nudges, 100),
      followUp: text(v.followUp, MAX_LINE),
      asked: v.asked === true,
      done: v.done === true,
      skipped: v.skipped === true,
    };
  }
  let chars = 0;
  for (const l of r.transcript) {
    if (!l || typeof l !== 'object') continue;
    const v = l as Record<string, unknown>;
    if (!isStage(v.stage) || (v.who !== 'you' && v.who !== 'coach')) continue;
    const t = text(v.text, MAX_LINE).trim();
    if (!t) continue;
    chars += t.length;
    if (chars > MAX_TRANSCRIPT_CHARS) break;
    out.transcript.push({ stage: v.stage, who: v.who, text: t, at: num(v.at, MAX_STAGE_MS * 2) });
  }
  return out;
}

/** Self-scores, 1..4 each; 0 means "not scored". */
export function cleanScores(raw: unknown): Scores {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return Object.fromEntries(
    SCORE_KEYS.map((k) => [k, Number.isInteger(r[k]) && (r[k] as number) >= 1 && (r[k] as number) <= 4 ? r[k] : 0]),
  ) as Scores;
}

export function talkStats(d: Draft): TalkStats {
  const stages = STAGE_IDS.map((id) => d.stages[id]);
  const totalMs = stages.reduce((n, s) => n + s.ms, 0);
  const talkMs = stages.reduce((n, s) => n + Math.min(s.talkMs, s.ms), 0);
  return {
    mic: d.mic,
    totalMs,
    talkMs,
    talkRatio: d.mic && totalMs > 0 ? Math.min(1, talkMs / totalMs) : 0,
    longestSilenceMs: Math.max(0, ...stages.map((s) => s.longestSilenceMs)),
    nudges: stages.reduce((n, s) => n + s.nudges, 0),
    skipped: STAGE_IDS.filter((id) => d.stages[id].skipped),
  };
}

export function clock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export const pick = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];

// ================================================================ the arena
// Everything the dashboard's Arena shows is derived here from the finished
// rounds, the same way ladder progress is derived from ac_events: no extra
// tables, so the numbers can always be recomputed and explained.

/** One finished round, as much as the Arena needs. */
export type RoundFacts = {
  id: number;
  slug: string;
  mode: Mode;
  finishedAt: string;
  acAfterStart: boolean;
  scores: Scores | null;
  talkStats: TalkStats | null;
  mistakes: MistakeKey[];
  /** The blind pattern call, if any. */
  pattern: string;
};

const DAY = 24 * 60 * 60_000;
/** A failed problem comes back twice: 3 days after the fail, then 14 days after passing that retry. Pass both: mastered. */
export const REDO_DAYS = [3, 14];
export const MAX_ROUND_MS = 50 * 60_000;

/**
 * A round you should redo: no Accepted, any self-score of 2 or lower, more
 * than 50 minutes, or you tagged yourself as freezing or picking the wrong pattern.
 */
export function failedRound(r: RoundFacts): boolean {
  if (!r.acAfterStart) return true;
  if (scored(r.scores) && SCORE_KEYS.some((k) => r.scores![k] <= 2)) return true;
  if ((r.talkStats?.totalMs ?? 0) > MAX_ROUND_MS) return true;
  return r.mistakes.includes('froze') || r.mistakes.includes('wrong_pattern');
}

export type RedoItem = { slug: string; dueAt: string; /** 0 or 1: which retry it is on */ box: number; overdue: boolean };
export type RedoQueue = { due: RedoItem[]; upcoming: RedoItem[]; mastered: number };

export function redoQueue(rounds: RoundFacts[], now: number): RedoQueue {
  const state = new Map<string, { box: number; due: number } | 'mastered'>();
  for (const r of [...rounds].sort((a, b) => a.finishedAt.localeCompare(b.finishedAt))) {
    const at = new Date(r.finishedAt).getTime();
    const cur = state.get(r.slug);
    if (failedRound(r)) {
      state.set(r.slug, { box: 0, due: at + REDO_DAYS[0] * DAY });
    } else if (cur && cur !== 'mastered') {
      const box = cur.box + 1;
      state.set(r.slug, box >= REDO_DAYS.length ? 'mastered' : { box, due: at + REDO_DAYS[box] * DAY });
    }
  }
  const due: RedoItem[] = [];
  const upcoming: RedoItem[] = [];
  let mastered = 0;
  for (const [slug, s] of state) {
    if (s === 'mastered') {
      mastered++;
      continue;
    }
    const item = { slug, dueAt: new Date(s.due).toISOString(), box: s.box, overdue: now - s.due > DAY };
    (s.due <= now ? due : upcoming).push(item);
  }
  due.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  upcoming.sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  return { due, upcoming, mastered };
}

export type ReadinessPart = { key: 'volume' | 'score' | 'talk' | 'pattern' | 'backlog'; label: string; points: number; max: number };
export type Readiness = { score: number; parts: ReadinessPart[] };

const lastN = <T,>(xs: T[], n: number) => xs.slice(-n);

/**
 * Interview readiness, 0-100, out of five parts that are shown as they are:
 * recent volume, self-scores, talking, blind pattern calls, and the redo
 * backlog (which counts against you).
 */
export function readiness(rounds: RoundFacts[], now: number): Readiness {
  const done = [...rounds].filter((r) => new Date(r.finishedAt).getTime() <= now).sort((a, b) => a.finishedAt.localeCompare(b.finishedAt));
  const recent = done.filter((r) => now - new Date(r.finishedAt).getTime() <= 14 * DAY).length;
  const scoredRounds = lastN(done.filter((r) => scored(r.scores)), 10);
  const avg = scoredRounds.length ? scoredRounds.reduce((n, r) => n + avgScore(r.scores!), 0) / scoredRounds.length : 0;
  const mic = lastN(done.filter((r) => r.talkStats?.mic), 10);
  const talk = mic.length ? mic.reduce((n, r) => n + r.talkStats!.talkRatio, 0) / mic.length : 0;
  const blind = lastN(done.filter((r) => r.mode === 'blind'), 10);
  const acc = blind.length ? blind.filter((r) => callMatches(r)).length / blind.length : 0;
  const backlog = redoQueue(done, now).due.length;
  const parts: ReadinessPart[] = [
    { key: 'volume', label: 'Rounds, last 14 days', points: (Math.min(recent, 10) / 10) * 25, max: 25 },
    { key: 'score', label: 'Self-scores', points: avg ? ((avg - 1) / 3) * 30 : 0, max: 30 },
    { key: 'talk', label: 'Talking', points: Math.min(talk / 0.6, 1) * 15, max: 15 },
    { key: 'pattern', label: 'Blind pattern calls', points: acc * 15, max: 15 },
    { key: 'backlog', label: 'Redos cleared', points: done.length ? Math.max(0, 1 - backlog / 4) * 15 : 0, max: 15 },
  ].map((p) => ({ ...p, points: Math.round(p.points) })) as ReadinessPart[];
  return { score: parts.reduce((n, p) => n + p.points, 0), parts };
}

function callMatches(r: RoundFacts): boolean {
  const p = findProblem(r.slug);
  return !!p && patternMatches(r.pattern, p.topic);
}

export type Arena = {
  total: number;
  recent: (RoundFacts & { verdict: Verdict | null })[];
  readiness: Readiness;
  /** Change against the same calculation a week ago; null with no history that old. */
  delta: number | null;
  redo: RedoQueue;
  /** Most frequent first, over the last 20 rounds. */
  mistakes: { key: MistakeKey; count: number }[];
  pattern: { calls: number; hits: number };
  averages: Scores | null;
  /** Passed rounds in a row, newest first. */
  streak: number;
};

export function arenaSummary(rounds: RoundFacts[], now: number): Arena {
  const sorted = [...rounds].sort((a, b) => b.finishedAt.localeCompare(a.finishedAt));
  const weekAgo = now - 7 * DAY;
  const older = sorted.filter((r) => new Date(r.finishedAt).getTime() <= weekAgo);
  const counts = new Map<MistakeKey, number>();
  for (const r of sorted.slice(0, 20)) for (const m of r.mistakes) counts.set(m, (counts.get(m) ?? 0) + 1);
  const blind = sorted.filter((r) => r.mode === 'blind');
  const sc = sorted.filter((r) => scored(r.scores)).slice(0, 10);
  let streak = 0;
  for (const r of sorted) {
    if (failedRound(r)) break;
    streak++;
  }
  const now_ = readiness(sorted, now);
  return {
    total: sorted.length,
    recent: sorted.slice(0, 6).map((r) => ({ ...r, verdict: verdictOf(r.scores) })),
    readiness: now_,
    delta: older.length ? now_.score - readiness(older, weekAgo).score : null,
    redo: redoQueue(sorted, now),
    mistakes: [...counts].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count),
    pattern: { calls: blind.length, hits: blind.filter(callMatches).length },
    averages: sc.length
      ? (Object.fromEntries(SCORE_KEYS.map((k) => [k, sc.reduce((n, r) => n + r.scores![k], 0) / sc.length])) as Scores)
      : null,
    streak,
  };
}
