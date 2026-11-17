/**
 * Reading a spoken answer: what you said (speech-to-text phrases with the
 * time each one finished) and the C/A/R/L beats you tapped while talking.
 * Produces the checks shown after an answer and picks the follow-up probe
 * aimed at the weakest spot, the way a real interviewer digs.
 */
import type { ConceptKey } from './playbook';
import type { QType } from './questions';
import { type SignalKey, signalByKey } from './signals';
import { BLAND_ASKS, RED_ASKS } from './kit';
import { I_WORDS, WE_WORDS, actionClauses, count, fillerCount, hasNumber, wordCount, findPhrase } from './text';

export type Beat = 'c' | 'a' | 'r' | 'l';
export const BEATS: { key: Beat; title: string; target: number; hint: string }[] = [
  { key: 'c', title: 'Context', target: 0.1, hint: 'Just enough setup, with the stakes.' },
  { key: 'a', title: 'Actions', target: 0.6, hint: 'What you did, with reasons. Most of the time.' },
  { key: 'r', title: 'Results', target: 0.2, hint: 'What changed, with evidence.' },
  { key: 'l', title: 'Learnings', target: 0.1, hint: 'What you would keep or change.' },
];
export type BeatMark = { b: Beat; t: number };
export type Segment = { t: number; text: string };
export type Grade = 'good' | 'ok' | 'bad';
export type Check = { key: string; label: string; value: string; target: string; grade: Grade; concept: ConceptKey };

export type AnswerInput = {
  qtype: QType;
  signals: SignalKey[];
  segments: Segment[];
  beats: BeatMark[];
  durationMs: number;
  mic: boolean;
  /** Hypotheticals: how many clarifying questions were asked, and how many were good ones. */
  clarifiers?: { asked: number; good: number };
};

export type AnswerMetrics = {
  durationMs: number;
  mic: boolean;
  words: number;
  wpm: number;
  /** Share of I-words among I+we words, or -1 when too few to judge. */
  iShare: number;
  fillersPerMin: number;
  hasNumber: boolean;
  resultSaid: boolean;
  learningSaid: boolean;
  actions: number;
  /** Longest stretch, in seconds, without a new "I did…" (from the start up to the last action). */
  longestGapS: number;
  split: Record<Beat, number> | null;
  headline: boolean;
  hedges: number;
  framework: boolean;
  example: boolean;
  scenarios: number;
  closing: boolean;
  tension: boolean;
  relationship: boolean;
  clarifiers: { asked: number; good: number };
  tmay: { origin: boolean; history: boolean; negative: string | null; forward: boolean } | null;
  ask: { bland: string | null; red: string | null } | null;
};

const RESULT = /\b(as a result|in the end|the result|ended up|outcome|which led|led to|shipped|launched|saved|increased|reduced|improved|cut (it|the)|went from|dropped|grew|won|finished|delivered)\b/i;
const LEARNING = /\b(i learned|taught me|lesson|i realized|looking back|next time|now i|differently|changed how i|since then|from then on|takeaway)\b/i;
const HEDGE = /\b(it (really )?depends|i('d| would) need more information|hard to say|i'm not sure what)\b/gi;
const FRAMEWORK = /\b(two|three|four|2|3|4) (ways|layers|kinds|types|buckets|levels|things|parts|approaches|modes|principles|steps|questions|factors)\b|\bfirst(ly)?,?\b[\s\S]*\bsecond(ly)?\b/i;
const EXAMPLE = /\b(for example|for instance|recently|one time|a time when|at my (internship|job|last|previous)|on my|when i was|in my (internship|last))\b/i;
const SCENARIO = /\bif (it's|it is|the|we|they|that's|there's|this|i)\b/gi;
const CLOSING = /\b(i've learned|i have learned|the key|biggest mistake|the principle|next,? i('d| would)|after that,? i('d| would)|retro\w*|lesson|the takeaway)\b/i;
const TENSION = /\b(upset|frustrat\w*|angry|pushed back|disagree\w*|heated|tense|argu\w*|insisted|refused|concern\w*|worried|pressure|opposed)\b/i;
const RELATION = /\b(relationship|still work|work(ed)? together|trust|thanked|appreciated|on good terms|collaborat\w*)\b/i;
const ORIGIN = /\b(since i was (a kid|\d+|young|little)|ever since i was|as a (kid|child)|when i was (\d+|little|young|a kid))\b/i;
const HISTORY = /\b(then|after that|next|later) i (joined|moved|went|worked|switched|started)\b/gi;
const FORWARD = /\b(excited|looking (to|for|forward)|hope to|want to|eager|drawn to|bring|next step|that's why i'm|why i'm here)\b/i;
const NEGATIVE = ['was a mess', 'poor engineering', 'bad manager', 'toxic', 'stuck', 'no growth', 'hated', 'boring', 'terrible', 'disorganized'];
const SLOW_START = /^(so,?\s+)?(this|it) was (back )?in \d{4}|^(so,?\s+)?back in \d{4}|^(so,?\s+)?basically/i;

function beatSplit(beats: BeatMark[], durationMs: number): Record<Beat, number> | null {
  if (beats.length === 0 || durationMs < 5000) return null;
  const marks = [...beats].sort((a, b) => a.t - b.t);
  if (marks[0].t > 1500) marks.unshift({ b: 'c', t: 0 });
  const total: Record<Beat, number> = { c: 0, a: 0, r: 0, l: 0 };
  marks.forEach((m, i) => {
    const end = i + 1 < marks.length ? marks[i + 1].t : durationMs;
    total[m.b] += Math.max(0, Math.min(end, durationMs) - m.t);
  });
  const sum = total.c + total.a + total.r + total.l || 1;
  return { c: total.c / sum, a: total.a / sum, r: total.r / sum, l: total.l / sum };
}

/**
 * Longest wait between actions, from the start of the answer to the last
 * action. Results and learnings legitimately have no actions, so when you
 * tapped a Results beat the window stops there; otherwise learning lines are
 * left out.
 */
function longestGap(segments: Segment[], beats: BeatMark[]): number {
  const firstR = beats.filter((b) => b.b === 'r' || b.b === 'l').reduce((m, b) => Math.min(m, b.t), Infinity);
  const inWindow = segments.filter((s) => s.t <= firstR + 3000 && !LEARNING.test(s.text));
  const times = inWindow.filter((s) => actionClauses(s.text) > 0).map((s) => s.t);
  if (times.length === 0) return inWindow.length ? Math.round((inWindow[inWindow.length - 1].t || 0) / 1000) : 0;
  let prev = 0;
  let max = 0;
  for (const t of times) {
    max = Math.max(max, t - prev);
    prev = t;
  }
  return Math.round(max / 1000);
}

export function answerMetrics(a: AnswerInput): AnswerMetrics {
  const all = a.segments.map((s) => s.text).join(' ');
  const words = wordCount(all);
  const min = a.durationMs / 60_000;
  const iN = count(all, I_WORDS);
  const weN = count(all, WE_WORDS);
  const opener = a.segments.slice(0, 3).map((s) => s.text).join(' ');
  return {
    durationMs: a.durationMs,
    mic: a.mic,
    words,
    wpm: min >= 0.25 ? Math.round(words / min) : 0,
    iShare: iN + weN < 3 ? -1 : iN / (iN + weN),
    fillersPerMin: min >= 0.25 ? Math.round((fillerCount(all) / min) * 10) / 10 : 0,
    hasNumber: hasNumber(all),
    resultSaid: RESULT.test(all),
    learningSaid: LEARNING.test(all) || a.beats.some((b) => b.b === 'l'),
    actions: actionClauses(all),
    longestGapS: longestGap(a.segments, a.beats),
    split: beatSplit(a.beats, a.durationMs),
    headline: !SLOW_START.test(opener.trim()) && actionClauses(opener.split(/\s+/).slice(0, 40).join(' ')) > 0,
    hedges: count(all, HEDGE),
    framework: FRAMEWORK.test(all),
    example: EXAMPLE.test(all),
    scenarios: count(all, SCENARIO),
    closing: CLOSING.test(a.segments.slice(-3).map((s) => s.text).join(' ')),
    tension: TENSION.test(all),
    relationship: RELATION.test(all),
    clarifiers: a.clarifiers ?? { asked: 0, good: 0 },
    tmay: a.qtype === 'tmay' ? tmayLint(all) : null,
    ask: a.qtype === 'ask' ? askLint(all) : null,
  };
}

export function tmayLint(text: string) {
  return { origin: ORIGIN.test(text), history: count(text, HISTORY) >= 2, negative: findPhrase(text, NEGATIVE), forward: FORWARD.test(text) };
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const pct = (x: number) => `${Math.round(x * 100)}%`;

/** Time bands, in seconds, for each kind of answer. */
export function band(qtype: QType, kind: 'trunk' | 'leaf' = 'trunk'): [number, number, number] {
  if (kind === 'leaf') return [5, 20, 40];
  if (qtype === 'tmay') return [75, 135, 180];
  if (qtype === 'ask') return [5, 30, 60];
  if (qtype === 'hypo') return [90, 210, 270];
  return [90, 180, 240];
}

/** The checks shown after an answer. Every one links to the Playbook card it comes from. */
/** Bland or red-flag wording in a question you plan to ask. */
export const askLint = (text: string) => ({ bland: findPhrase(text, BLAND_ASKS), red: findPhrase(text, RED_ASKS) });

/** Follow-up answers: a leaf wants a sentence or two, not a second story. */
export function probeChecks(probes: { level: 'branch' | 'leaf'; durationMs: number }[]): Check[] {
  return probes
    .filter((p) => p.level === 'leaf' && p.durationMs > 0)
    .map((p) => {
      const s = Math.round(p.durationMs / 1000);
      return { key: 'leaf', label: 'Short follow-up answer', value: `${s}s`, target: '20s or less', grade: s <= 20 ? 'good' : s <= 40 ? 'ok' : 'bad', concept: 'tbl' } as Check;
    });
}

export function answerChecks(m: AnswerMetrics, qtype: QType, signals: SignalKey[]): Check[] {
  const sec = m.durationMs / 1000;
  const [lo, hi, max] = band(qtype);
  const out: Check[] = [
    {
      key: 'length',
      label: 'Length',
      value: mmss(sec),
      target: `${mmss(lo)}–${mmss(hi)}`,
      grade: sec >= lo && sec <= hi ? 'good' : sec >= lo * 0.6 && sec <= max ? 'ok' : 'bad',
      concept: qtype === 'tmay' ? 'tmay' : 'carl',
    },
  ];
  if (m.split && qtype !== 'tmay') {
    const { c, a, r, l } = m.split;
    out.push({
      key: 'split',
      label: 'C / A / R+L',
      value: `${pct(c)} / ${pct(a)} / ${pct(r + l)}`,
      target: '10 / 60 / 30',
      grade: c <= 0.2 && a >= 0.45 && r + l >= 0.18 ? 'good' : c <= 0.3 && a >= 0.35 && r + l >= 0.1 ? 'ok' : 'bad',
      concept: 'carl',
    });
  }
  if (!m.mic) return out;
  if (qtype === 'ask') {
    const a = m.ask ?? { bland: null, red: null };
    out.push({ key: 'bland', label: 'Specific, not bland', value: a.bland ? `“${a.bland}”` : 'specific', target: 'not a stock question', grade: a.bland ? 'ok' : 'good', concept: 'asks' });
    out.push({ key: 'red', label: 'No red flags', value: a.red ? `“${a.red}”` : 'none', target: 'no pay, perks or personal', grade: a.red ? 'bad' : 'good', concept: 'asks' });
    return out;
  }
  if (m.iShare >= 0)
    out.push({ key: 'i', label: '“I” vs “we”', value: `${pct(m.iShare)} I`, target: '60% or more', grade: m.iShare >= 0.6 ? 'good' : m.iShare >= 0.4 ? 'ok' : 'bad', concept: 'actions' });
  if (qtype === 'time' || qtype === 'values' || qtype === 'hypo') {
    out.push({ key: 'actions', label: 'Actions said', value: String(m.actions), target: '4 or more', grade: m.actions >= 4 ? 'good' : m.actions >= 2 ? 'ok' : 'bad', concept: 'actions' });
    out.push({ key: 'gap', label: 'Longest stretch without an action', value: `${m.longestGapS}s`, target: '30s or less', grade: m.longestGapS <= 30 ? 'good' : m.longestGapS <= 45 ? 'ok' : 'bad', concept: 'detail' });
  }
  if (qtype === 'time') {
    out.push({ key: 'evidence', label: 'Evidence in the result', value: m.hasNumber ? 'yes' : 'no', target: 'a number or estimate', grade: m.hasNumber ? 'good' : m.resultSaid ? 'ok' : 'bad', concept: 'results' });
    out.push({ key: 'learning', label: 'Learnings', value: m.learningSaid ? 'yes' : 'no', target: 'say what you learned', grade: m.learningSaid ? 'good' : 'bad', concept: 'learnings' });
    if (signals.includes('conflict')) {
      out.push({ key: 'tension', label: 'Real tension in it', value: m.tension ? 'yes' : 'no', target: 'name the disagreement', grade: m.tension ? 'good' : 'bad', concept: 'conflict' });
      out.push({ key: 'relationship', label: 'Relationship afterwards', value: m.relationship ? 'yes' : 'no', target: 'say where it ended up', grade: m.relationship ? 'good' : 'bad', concept: 'conflict' });
    }
  }
  if (qtype === 'values') {
    out.push({ key: 'framework', label: 'Framework named', value: m.framework ? 'yes' : 'no', target: '2–3 named parts', grade: m.framework ? 'good' : 'bad', concept: 'values' });
    out.push({ key: 'example', label: 'Backed by a story', value: m.example ? 'yes' : 'no', target: '"For example, …"', grade: m.example ? 'good' : 'bad', concept: 'values' });
  }
  if (qtype === 'hypo') {
    const c = m.clarifiers;
    out.push({
      key: 'clarify',
      label: 'Clarifying questions',
      value: `${c.asked} (${c.good} useful)`,
      target: '1–2 useful',
      grade: c.good >= 1 && c.asked <= 2 ? 'good' : c.asked <= 3 && c.asked > 0 ? 'ok' : 'bad',
      concept: 'hypo',
    });
    out.push({ key: 'scenarios', label: 'Scenarios walked', value: String(m.scenarios), target: '2–3 "if it\'s…"', grade: m.scenarios >= 2 ? 'good' : m.scenarios === 1 ? 'ok' : 'bad', concept: 'hypo' });
    out.push({ key: 'example', label: 'Grounded in a real story', value: m.example ? 'yes' : 'no', target: '"I faced this when…"', grade: m.example ? 'good' : 'bad', concept: 'hypo' });
    out.push({ key: 'hedge', label: '"It depends"', value: String(m.hedges), target: '1 or fewer', grade: m.hedges <= 1 ? 'good' : m.hedges <= 2 ? 'ok' : 'bad', concept: 'hypo' });
  }
  if (qtype === 'tmay' && m.tmay) {
    const t = m.tmay;
    out.push({ key: 'origin', label: 'Origin story', value: t.origin ? 'yes' : 'no', target: 'skip the childhood', grade: t.origin ? 'bad' : 'good', concept: 'tmay' });
    out.push({ key: 'history', label: 'Job-by-job history', value: t.history ? 'yes' : 'no', target: 'highlights, not a timeline', grade: t.history ? 'bad' : 'good', concept: 'tmay' });
    out.push({ key: 'negative', label: 'Negativity', value: t.negative ? `“${t.negative}”` : 'none', target: 'none', grade: t.negative ? 'bad' : 'good', concept: 'tmay' });
    out.push({ key: 'forward', label: 'Forward-looking close', value: t.forward ? 'yes' : 'no', target: 'end on what is next', grade: t.forward ? 'good' : 'ok', concept: 'tmay' });
    out.push({ key: 'evidence', label: 'Accomplishments with numbers', value: m.hasNumber ? 'yes' : 'no', target: 'impact you can count', grade: m.hasNumber ? 'good' : 'ok', concept: 'tmay' });
  }
  out.push({ key: 'fillers', label: 'Filler words', value: `${m.fillersPerMin}/min`, target: '3/min or fewer', grade: m.fillersPerMin <= 3 ? 'good' : m.fillersPerMin <= 6 ? 'ok' : 'bad', concept: 'human' });
  return out;
}

/** A plain score out of 100 for an answer: share of good checks, ok counting half. */
export const answerScore = (checks: Check[]) =>
  checks.length ? Math.round((checks.reduce((n, c) => n + (c.grade === 'good' ? 1 : c.grade === 'ok' ? 0.5 : 0), 0) / checks.length) * 100) : 0;

/** A "good take" for story rehearsal: shape and length both within reach. */
export function goodTake(m: AnswerMetrics, qtype: QType): boolean {
  const checks = answerChecks(m, qtype, []);
  const len = checks.find((c) => c.key === 'length');
  const split = checks.find((c) => c.key === 'split');
  return !!len && len.grade !== 'bad' && (!split || split.grade !== 'bad') && answerScore(checks) >= 60;
}

export type Probe = { text: string; why: string; concept: ConceptKey; level: 'branch' | 'leaf' };

/**
 * The leaf follow-up: aimed at the weakest thing in the answer, like an
 * interviewer checking a doubt. Falls back to a common follow-up.
 */
export function leafProbe(m: AnswerMetrics, qtype: QType, signals: SignalKey[]): Probe {
  const leaf = (text: string, why: string, concept: ConceptKey): Probe => ({ text, why, concept, level: 'leaf' });
  if (qtype === 'hypo' && m.clarifiers.asked === 0) return leaf('Before you go on: is there anything you would want to know first?', 'You did not ask a single clarifying question.', 'hypo');
  if (qtype === 'hypo' && !m.example) return leaf('Have you actually faced something like this?', 'Your answer stayed theoretical.', 'hypo');
  if (qtype === 'values' && !m.example) return leaf('Can you give me an example of that?', 'The framework had no story behind it.', 'values');
  if (m.mic && m.iShare >= 0 && m.iShare < 0.5) return leaf('What was your part in that, specifically?', 'It was mostly "we", so your own part was unclear.', 'actions');
  if (signals.includes('conflict') && m.mic && !m.relationship) return leaf('Where is your relationship with them now?', 'A conflict result has to include the relationship.', 'conflict');
  if (m.mic && !m.hasNumber) return leaf('How did you measure whether it worked?', 'No number or estimate in the result.', 'results');
  if (m.mic && !m.learningSaid) return leaf('What would you do differently next time?', 'No learnings.', 'learnings');
  if (m.longestGapS > 45) return leaf('What exactly did you do in that part?', 'A long stretch went by with no action of yours.', 'detail');
  return leaf('What was the hardest part of that?', 'A common follow-up, testing whether your story has real difficulty in it.', 'tbl');
}

/** The branch follow-up: go deeper into one area the question scores, preferring your story's prepared follow-ups. */
export function branchProbe(signals: SignalKey[], prepared: { q: string }[], seed: number): Probe {
  const pool = prepared.length ? prepared.map((p) => p.q) : signals.flatMap((k) => signalByKey(k).probes);
  const text = pool.length ? pool[Math.abs(seed) % pool.length] : 'What was the hardest part?';
  return { text, why: prepared.length ? 'One of the follow-ups you prepared for this story.' : 'Digging into the signal area this question scores.', concept: 'tbl', level: 'branch' };
}
