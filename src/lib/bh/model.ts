/**
 * Everything saved besides stories: the member's prep profile (target level,
 * company values, Big Three picks, TMAY, questions to ask), practice rounds,
 * quick drills, and post-interview debriefs. Shared by browser and server;
 * the server runs the clean* functions on whatever it is sent.
 */
import { type AnswerMetrics, type Beat, type BeatMark, type Check, type Segment } from './answer';
import { type AskRole, type FollowupKind, FOLLOWUP_KINDS, isAskRole } from './kit';
import { type CompanyKind, type LevelKey, isCompanyKind, isLevelKey } from './levels';
import type { QType } from './questions';
import { type SignalKey, isSignalKey } from './signals';
import { type Story } from './story';

const txt = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const arr = (v: unknown, max: number): unknown[] => (Array.isArray(v) ? v.slice(0, max) : []);
const posInt = (v: unknown) => (Number.isInteger(v) && (v as number) > 0 && (v as number) < 1e15 ? (v as number) : null);
const num = (v: unknown, lo: number, hi: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : 0);
const signals = (v: unknown) => [...new Set(arr(v, 8).filter(isSignalKey))];

// ------------------------------------------------------------------ profile
export type Tmay = { summary: string; wins: string[]; halo: string; forward: string; gap: string };
export type Ask = { role: AskRole; text: string };
export type CompanyValue = { name: string; signals: SignalKey[] };
export type Big3 = { favoriteId: number | null; conflictId: number | null; conflictRight: boolean; conflictCentral: boolean };
export type Profile = {
  level: LevelKey;
  companyKind: CompanyKind;
  company: string;
  values: CompanyValue[];
  hurry: boolean;
  big3: Big3;
  tmay: Tmay;
  asks: Ask[];
};

export const emptyTmay = (): Tmay => ({ summary: '', wins: [], halo: '', forward: '', gap: '' });
export const defaultProfile = (): Profile => ({
  level: 'L3',
  companyKind: 'bigtech',
  company: '',
  values: [],
  hurry: false,
  big3: { favoriteId: null, conflictId: null, conflictRight: false, conflictCentral: false },
  tmay: emptyTmay(),
  asks: [],
});

export function cleanTmay(raw: unknown): Tmay {
  const t = obj(raw);
  return {
    summary: txt(t.summary, 500),
    wins: arr(t.wins, 3).map((w) => txt(w, 300)).filter(Boolean),
    halo: txt(t.halo, 300),
    forward: txt(t.forward, 300),
    gap: txt(t.gap, 300),
  };
}

export function cleanProfile(raw: unknown): Profile {
  const r = obj(raw);
  const b = obj(r.big3);
  return {
    level: isLevelKey(r.level) ? r.level : 'L3',
    companyKind: isCompanyKind(r.companyKind) ? r.companyKind : 'bigtech',
    company: txt(r.company, 80),
    values: arr(r.values, 16)
      .map((v) => ({ name: txt(obj(v).name, 60), signals: signals(obj(v).signals) }))
      .filter((v) => v.name),
    hurry: r.hurry === true,
    big3: { favoriteId: posInt(b.favoriteId), conflictId: posInt(b.conflictId), conflictRight: b.conflictRight === true, conflictCentral: b.conflictCentral === true },
    tmay: cleanTmay(r.tmay),
    asks: arr(r.asks, 15)
      .map((a) => ({ role: isAskRole(obj(a).role) ? (obj(a).role as AskRole) : ('manager' as const), text: txt(obj(a).text, 300) }))
      .filter((a) => a.text),
  };
}

/** What the full TMAY says out loud, in order. */
export const tmayText = (t: Tmay) => [t.summary, ...t.wins, t.halo, t.gap, t.forward].filter(Boolean).join(' ');

// ------------------------------------------------------------------ rounds
export type RoundKind = 'question' | 'rehearse' | 'tmay' | 'loop';
export type Persona = 'none' | 'examiner' | 'conversationalist';
export type ProbeTake = { text: string; level: 'branch' | 'leaf'; lines: Segment[]; durationMs: number };
export type Selection = { pickedId: number | null; ms: number; grade: 'best' | 'close' | 'better' | 'none' };
export type Decode = { picked: SignalKey[]; type: QType | null; correct: boolean };

export type RoundInput = {
  kind: RoundKind;
  questionId: string;
  qtype: QType;
  storyId: number | null;
  segments: Segment[];
  probes: ProbeTake[];
  durationMs: number;
  mic: boolean;
  beats: BeatMark[];
  selection: Selection | null;
  decode: Decode | null;
  clarifiers: { asked: number; good: number };
  persona: Persona;
  loopId: string;
  script: string;
};
export type BehavioralRound = RoundInput & { id: number; metrics: AnswerMetrics; checks: Check[]; score: number; good: boolean; createdAt: string };

export const MAX_ANSWER_CHARS = 9000;
export const MAX_ANSWER_MS = 6 * 60_000;
const QTYPE_KEYS: QType[] = ['time', 'values', 'hypo', 'tmay', 'ask'];
const BEAT_KEYS: Beat[] = ['c', 'a', 'r', 'l'];

function segs(raw: unknown, budget: { left: number }): Segment[] {
  const out: Segment[] = [];
  for (const s of arr(raw, 200)) {
    // Rounds saved before the rebuild stored plain strings.
    const o = typeof s === 'string' ? { text: s, t: 0 } : obj(s);
    const text = txt(o.text, 600);
    if (!text || text.length > budget.left) continue;
    budget.left -= text.length;
    out.push({ text, t: num(o.t, 0, MAX_ANSWER_MS) });
  }
  return out;
}

export function cleanRound(raw: unknown): RoundInput | null {
  const r = obj(raw);
  const questionId = txt(r.questionId, 40);
  if (!questionId) return null;
  const budget = { left: MAX_ANSWER_CHARS };
  const sel = r.selection === null || r.selection === undefined ? null : obj(r.selection);
  const dec = r.decode === null || r.decode === undefined ? null : obj(r.decode);
  const cl = obj(r.clarifiers);
  const kind = (['question', 'rehearse', 'tmay', 'loop'] as const).find((k) => k === r.kind) ?? 'question';
  return {
    kind,
    questionId,
    qtype: QTYPE_KEYS.find((k) => k === r.qtype) ?? 'time',
    storyId: posInt(r.storyId),
    segments: segs(r.segments, budget),
    probes: arr(r.probes, 3).map((p) => {
      const o = obj(p);
      return { text: txt(o.text, 200), level: o.level === 'branch' ? ('branch' as const) : ('leaf' as const), lines: segs(o.lines, budget), durationMs: num(o.durationMs, 0, MAX_ANSWER_MS) };
    }),
    durationMs: num(r.durationMs, 0, MAX_ANSWER_MS),
    mic: r.mic === true,
    beats: arr(r.beats, 40)
      .map((b) => ({ b: obj(b).b as Beat, t: num(obj(b).t, 0, MAX_ANSWER_MS) }))
      .filter((b) => BEAT_KEYS.includes(b.b)),
    selection: sel && {
      pickedId: posInt(sel.pickedId),
      ms: num(sel.ms, 0, 600_000),
      grade: (['best', 'close', 'better', 'none'] as const).find((g) => g === sel.grade) ?? 'none',
    },
    decode: dec && { picked: signals(dec.picked), type: QTYPE_KEYS.find((k) => k === dec.type) ?? null, correct: dec.correct === true },
    clarifiers: { asked: num(cl.asked, 0, 10), good: num(cl.good, 0, 10) },
    persona: (['none', 'examiner', 'conversationalist'] as const).find((p) => p === r.persona) ?? 'none',
    loopId: txt(r.loopId, 40),
    script: txt(r.script, 40),
  };
}

// ------------------------------------------------------------------ drills
export type DrillKind = 'decode' | 'select';
export type DrillInput = { kind: DrillKind; questionId: string; correct: boolean; ms: number; detail: Record<string, unknown> };
export function cleanDrill(raw: unknown): DrillInput | null {
  const r = obj(raw);
  const kind = r.kind === 'decode' || r.kind === 'select' ? r.kind : null;
  const questionId = txt(r.questionId, 40);
  if (!kind || !questionId) return null;
  const d = obj(r.detail);
  return {
    kind,
    questionId,
    correct: r.correct === true,
    ms: num(r.ms, 0, 600_000),
    detail: { picked: arr(d.picked, 8).map((x) => (typeof x === 'string' || typeof x === 'number' ? x : null)).filter((x) => x !== null), grade: txt(d.grade, 12) },
  };
}

// ------------------------------------------------------------------ debriefs
export type DebriefQuestion = { text: string; signal: SignalKey | ''; storyId: number | null; followups: FollowupKind[]; felt: 'good' | 'ok' | 'bad'; missing: string };
export type Debrief = {
  id: number;
  company: string;
  roundKind: string;
  when: string;
  questions: DebriefQuestion[];
  engagement: 'high' | 'neutral' | 'low';
  storiesTold: number;
  rushed: boolean;
  early: boolean;
  notes: string;
  createdAt: string;
};
export type DebriefInput = Omit<Debrief, 'id' | 'createdAt'>;

export function cleanDebrief(raw: unknown): DebriefInput | null {
  const r = obj(raw);
  const company = txt(r.company, 80);
  const questions = arr(r.questions, 15)
    .map((q) => {
      const o = obj(q);
      return {
        text: txt(o.text, 300),
        signal: isSignalKey(o.signal) ? o.signal : ('' as const),
        storyId: posInt(o.storyId),
        followups: [...new Set(arr(o.followups, 4).filter((f): f is FollowupKind => FOLLOWUP_KINDS.some((k) => k.key === f)))],
        felt: o.felt === 'good' ? ('good' as const) : o.felt === 'bad' ? ('bad' as const) : ('ok' as const),
        missing: txt(o.missing, 200),
      };
    })
    .filter((q) => q.text);
  if (!company && questions.length === 0) return null;
  const when = txt(r.when, 10);
  return {
    company,
    roundKind: txt(r.roundKind, 60),
    when: /^\d{4}-\d{2}-\d{2}$/.test(when) ? when : '',
    questions,
    engagement: r.engagement === 'high' || r.engagement === 'low' ? r.engagement : 'neutral',
    storiesTold: num(r.storiesTold, 0, 30),
    rushed: r.rushed === true,
    early: r.early === true,
    notes: txt(r.notes, 2000),
  };
}

/** Turn a debrief into to-dos on the stories it involved (and gaps to mine). */
export function debriefActions(d: DebriefInput, stories: Pick<Story, 'id' | 'title'>[]): { storyId: number | null; text: string }[] {
  const out: { storyId: number | null; text: string }[] = [];
  const title = (id: number | null) => stories.find((s) => s.id === id)?.title;
  const short = (s: string) => (s.length > 70 ? `${s.slice(0, 67)}…` : s);
  for (const q of d.questions) {
    if (q.storyId && !title(q.storyId)) continue;
    if (!q.storyId) {
      out.push({ storyId: null, text: `Find a story for: “${short(q.text)}”` });
      continue;
    }
    if (q.followups.includes('skeptical')) out.push({ storyId: q.storyId, text: 'They doubted your part: make your own actions and decisions unmistakable ("I…").' });
    if (q.followups.includes('redirecting')) out.push({ storyId: q.storyId, text: `Missed the signal for “${short(q.text)}”: give the requested signal in the first 20 seconds.` });
    if (q.missing) out.push({ storyId: q.storyId, text: `Add this fact you were asked for: ${short(q.missing)}` });
    if (q.felt === 'bad' && !q.followups.length) out.push({ storyId: q.storyId, text: 'Felt weak in a real interview: rehearse it again and run the Doctor.' });
  }
  if (d.rushed || d.storiesTold <= 2) out.push({ storyId: null, text: 'Pacing: you covered few stories. Trim context and aim for about 2 minutes per answer.' });
  if (d.early) out.push({ storyId: null, text: 'Finished early: your answers may be too thin. Add actions and results.' });
  return out;
}
