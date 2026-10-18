/**
 * Pure rules for behavioral rounds, shared by browser and server: story and
 * round shapes, their limits, and the signals read off an answer.
 */
import { COMPETENCY_KEYS, ANSWER_MAX_S, ANSWER_TARGET, PROBE_MAX_S, type CompetencyKey } from './behavioral-kit';
import { fillerCount, wordCount, type Grade, type Signal } from './interview-logic';

export const MAX_STORIES = 30;
export const MAX_STORY_FIELD = 700;
export const MAX_STORY_TITLE = 90;
export const MAX_ANSWER_CHARS = 8000;
export const ROUNDS_PER_DAY = 60;

export type Story = {
  id: number;
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  tags: CompetencyKey[];
  updatedAt: string;
};
export type StoryInput = Omit<Story, 'id' | 'updatedAt'>;

export type Star = { s: boolean; t: boolean; a: boolean; r: boolean };

export type AnswerMetrics = {
  /** How long you spoke for, as timed by the round. */
  durationMs: number;
  mic: boolean;
  words: number;
  wpm: number;
  iCount: number;
  weCount: number;
  hasNumber: boolean;
  resultSaid: boolean;
  fillersPerMin: number;
};

export type RoundInput = {
  questionId: string;
  storyId: number | null;
  answer: string[];
  probe: string[];
  durationMs: number;
  mic: boolean;
  star: Star;
};

export type BehavioralRound = RoundInput & { id: number; metrics: AnswerMetrics; createdAt: string };

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function cleanTags(raw: unknown): CompetencyKey[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((t): t is CompetencyKey => (COMPETENCY_KEYS as string[]).includes(t as string)))];
}

/** Null when it has no title (a story has to be findable). */
export function cleanStory(raw: unknown): StoryInput | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const title = text(r.title, MAX_STORY_TITLE);
  if (!title) return null;
  return {
    title,
    situation: text(r.situation, MAX_STORY_FIELD),
    task: text(r.task, MAX_STORY_FIELD),
    action: text(r.action, MAX_STORY_FIELD),
    result: text(r.result, MAX_STORY_FIELD),
    tags: cleanTags(r.tags),
  };
}

function lines(raw: unknown, budget: { left: number }): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const l of raw) {
    const t = text(l, 600);
    if (!t || t.length > budget.left) continue;
    budget.left -= t.length;
    out.push(t);
  }
  return out;
}

export function cleanRound(raw: unknown): RoundInput | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const questionId = text(r.questionId, 40);
  if (!questionId) return null;
  const budget = { left: MAX_ANSWER_CHARS };
  const s = (r.star && typeof r.star === 'object' ? r.star : {}) as Record<string, unknown>;
  const ms = typeof r.durationMs === 'number' && Number.isFinite(r.durationMs) ? r.durationMs : 0;
  return {
    questionId,
    storyId: Number.isInteger(r.storyId) && (r.storyId as number) > 0 ? (r.storyId as number) : null,
    answer: lines(r.answer, budget),
    probe: lines(r.probe, budget),
    durationMs: Math.round(Math.min(Math.max(0, ms), (ANSWER_MAX_S + PROBE_MAX_S) * 1000)),
    mic: r.mic === true,
    star: { s: s.s === true, t: s.t === true, a: s.a === true, r: s.r === true },
  };
}

const I_WORDS = /\b(i|i'm|i've|i'd|i'll|me|my|myself)\b/gi;
const WE_WORDS = /\b(we|we're|we've|we'd|we'll|us|our|ours)\b/gi;
const NUMBER = /\b\d+([.,]\d+)?\b|percent|%|\bhalf\b|\bdoubled?\b|\btwice\b|\btriple|\bhundred|\bthousand|\bmillion|\bzero\b/i;
const RESULT = /\b(as a result|in the end|the result|ended up|outcome|which led|led to|so we shipped|i shipped|we shipped|saved|increased|reduced|improved|cut (it|the)|went from)\b/i;

export function answerMetrics(r: RoundInput): AnswerMetrics {
  const all = r.answer.join(' ');
  const words = wordCount(all);
  const min = r.durationMs / 60_000;
  return {
    durationMs: r.durationMs,
    mic: r.mic,
    words,
    wpm: min >= 0.25 ? Math.round(words / min) : 0,
    iCount: all.match(I_WORDS)?.length ?? 0,
    weCount: all.match(WE_WORDS)?.length ?? 0,
    hasNumber: NUMBER.test(all),
    resultSaid: RESULT.test(all),
    fillersPerMin: min >= 0.25 ? Math.round((fillerCount(all) / min) * 10) / 10 : 0,
  };
}

const s = (n: number) => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`;

export function answerSignals(m: AnswerMetrics): Signal[] {
  const sec = m.durationMs / 1000;
  const [lo, hi] = ANSWER_TARGET;
  const length: Signal = {
    key: 'length',
    label: 'Length',
    value: s(sec),
    target: `${s(lo)}–${s(hi)}`,
    grade: sec >= lo && sec <= hi ? 'good' : sec >= 60 && sec <= ANSWER_MAX_S ? 'ok' : 'bad',
  };
  if (!m.mic) return [length];
  const pronouns = m.iCount + m.weCount;
  const share = pronouns ? m.iCount / pronouns : 0;
  const g = (ok: boolean): Grade => (ok ? 'good' : 'bad');
  return [
    length,
    {
      key: 'i',
      label: '“I” vs “we”',
      value: pronouns < 3 ? '–' : `${Math.round(share * 100)}% I`,
      target: '60% “I” or more',
      grade: pronouns < 3 ? 'ok' : share >= 0.6 ? 'good' : share >= 0.4 ? 'ok' : 'bad',
    },
    { key: 'result', label: 'Ended on a result', value: m.resultSaid ? 'yes' : 'no', target: 'say what changed', grade: g(m.resultSaid) },
    { key: 'number', label: 'A number in it', value: m.hasNumber ? 'yes' : 'no', target: 'quantify the result', grade: g(m.hasNumber) },
    {
      key: 'fillers',
      label: 'Filler words',
      value: `${m.fillersPerMin}/min`,
      target: '3/min or fewer',
      grade: m.fillersPerMin <= 3 ? 'good' : m.fillersPerMin <= 6 ? 'ok' : 'bad',
    },
  ];
}

/** Which competencies your stories cover, in the kit's order. */
export function coverage(stories: Pick<Story, 'tags'>[]): { covered: CompetencyKey[]; gaps: CompetencyKey[] } {
  const have = new Set(stories.flatMap((st) => st.tags));
  return { covered: COMPETENCY_KEYS.filter((k) => have.has(k)), gaps: COMPETENCY_KEYS.filter((k) => !have.has(k)) };
}
