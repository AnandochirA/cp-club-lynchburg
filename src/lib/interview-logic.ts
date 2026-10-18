/**
 * Pure rules for interview mode, shared by the browser and the server (like
 * chat-rules.ts): the shape of a session's draft, its size limits, and the
 * talk stats. The server never trusts a draft as sent; it runs cleanDraft.
 */
import { RANK_KEYS, curriculum, type Problem } from './curriculum';
import { STAGE_IDS, type ScoreKey, type StageId } from './interview-kit';

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
};

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
