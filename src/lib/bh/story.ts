/**
 * A story in the catalog, in CARL shape (Context, Actions, Results,
 * Learnings) plus everything prepared around it: the scale that sets its
 * scope, a table of contents for long tellings, prepared follow-ups, re-cuts
 * for each signal area, and framings for the weak spots the Doctor found.
 * Shared by browser and server; the server always re-cleans what it is sent.
 */
import { type Duration, isDuration } from './levels';
import { FOLLOWUP_SET } from './questions';
import { type SignalKey, isSignalKey } from './signals';

export type Source = 'work' | 'internship' | 'school' | 'club' | 'personal';
export type Tier = 'core' | 'supporting';
export type ActionTheme = 'designing' | 'aligning' | 'communicating' | 'implementing' | 'iterating' | 'testing' | 'releasing' | 'deciding';
export type ResultKind = 'metric' | 'estimate' | 'quote' | 'downstream' | 'relationship' | 'growth' | 'other';
export type LearningKind = 'technical' | 'process' | 'people' | 'strategic';

export type StoryContext = {
  /** The two or three sentences you actually say. */
  told: string;
  /** Detail kept in reserve for follow-ups. */
  stakes: string;
  constraints: string;
  people: string;
  alternatives: string;
};
export type StoryAction = { text: string; theme: ActionTheme | '' };
export type StoryResult = { text: string; kind: ResultKind };
export type StoryLearning = { text: string; kind: LearningKind | ''; applied: string };
export type Scale = { duration: Duration | ''; people: number; teams: number; contribution: number; impact: number };
export type TocItem = { theme: string; takeaway: string };
export type Followup = { q: string; a: string };
export type Todo = { id: string; text: string; done: boolean; at: string };

export type Story = {
  id: number;
  title: string;
  setting: string;
  source: Source;
  /** YYYY-MM, or '' if unknown. */
  when: string;
  tier: Tier;
  signals: SignalKey[];
  context: StoryContext;
  actions: StoryAction[];
  results: StoryResult[];
  learnings: StoryLearning[];
  scale: Scale;
  toc: TocItem[];
  tocOrder: 'chrono' | 'theme';
  followups: Followup[];
  recuts: Partial<Record<SignalKey, string>>;
  /** Doctor finding id → the framing you prepared for it (acknowledged weak spot). */
  defense: Record<string, string>;
  todos: Todo[];
  updatedAt: string;
};
export type StoryInput = Omit<Story, 'id' | 'updatedAt'>;

export const SOURCES: { key: Source; title: string }[] = [
  { key: 'work', title: 'Job' },
  { key: 'internship', title: 'Internship' },
  { key: 'school', title: 'School project' },
  { key: 'club', title: 'Club / contest / hackathon' },
  { key: 'personal', title: 'Personal' },
];
export const ACTION_THEMES: { key: ActionTheme; title: string; prompt: string }[] = [
  { key: 'designing', title: 'Designing', prompt: 'How did you gather what you needed? What options did you weigh, and why did you pick one?' },
  { key: 'aligning', title: 'Aligning', prompt: 'How did you get people with different priorities to agree? Which conversations did you start?' },
  { key: 'communicating', title: 'Communicating', prompt: 'How did you share progress or bad news? How did you explain it to non-experts?' },
  { key: 'implementing', title: 'Implementing', prompt: 'What did you build or do that someone else in your seat might not have? What were the turning points?' },
  { key: 'iterating', title: 'Iterating', prompt: 'What feedback or numbers did you watch, and what did you change because of them?' },
  { key: 'testing', title: 'Testing & debugging', prompt: 'How did you make sure it worked? How did you find the root cause?' },
  { key: 'releasing', title: 'Releasing', prompt: 'How did you roll it out safely? What happened right after launch?' },
  { key: 'deciding', title: 'Thinking & deciding', prompt: 'What did you analyze, which tradeoff did you weigh, what did you decide?' },
];
export const RESULT_KINDS: { key: ResultKind; title: string }[] = [
  { key: 'metric', title: 'Measured number' },
  { key: 'estimate', title: 'Estimate / order of magnitude' },
  { key: 'quote', title: 'What someone said' },
  { key: 'downstream', title: 'What it unlocked later' },
  { key: 'relationship', title: 'State of the relationship' },
  { key: 'growth', title: 'How someone grew' },
  { key: 'other', title: 'Other' },
];
export const LEARNING_KINDS: { key: LearningKind; title: string }[] = [
  { key: 'technical', title: 'Technical' },
  { key: 'process', title: 'Process' },
  { key: 'people', title: 'People' },
  { key: 'strategic', title: 'Strategic' },
];

export const MAX_STORIES = 30;
export const MAX_TITLE = 90;
export const MAX_SHORT = 160;
export const MAX_FIELD = 700;
export const MAX_ITEM = 450;
export const LIMITS = { actions: 16, results: 8, learnings: 6, toc: 6, followups: FOLLOWUP_SET.length + 4, todos: 20 };

const isOf = <T extends string>(v: unknown, keys: readonly { key: T }[]): v is T => keys.some((k) => k.key === v);
const txt = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const arr = (v: unknown, max: number): unknown[] => (Array.isArray(v) ? v.slice(0, max) : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const int = (v: unknown, lo: number, hi: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : 0);

export const emptyContext = (): StoryContext => ({ told: '', stakes: '', constraints: '', people: '', alternatives: '' });
export const emptyScale = (): Scale => ({ duration: '', people: 0, teams: 0, contribution: 0, impact: 0 });
export const emptyStory = (signals: SignalKey[] = []): StoryInput => ({
  title: '',
  setting: '',
  source: 'school',
  when: '',
  tier: 'supporting',
  signals,
  context: emptyContext(),
  actions: [],
  results: [],
  learnings: [],
  scale: emptyScale(),
  toc: [],
  tocOrder: 'theme',
  followups: [],
  recuts: {},
  defense: {},
  todos: [],
});

export function cleanSignals(raw: unknown): SignalKey[] {
  return Array.isArray(raw) ? [...new Set(raw.filter(isSignalKey))] : [];
}

export function cleanTodos(raw: unknown): Todo[] {
  return arr(raw, LIMITS.todos)
    .map((t) => {
      const o = obj(t);
      return { id: txt(o.id, 40), text: txt(o.text, MAX_SHORT), done: o.done === true, at: txt(o.at, 40) };
    })
    .filter((t) => t.id && t.text);
}

/** Null when it has no title (a story has to be findable). */
export function cleanStory(raw: unknown): StoryInput | null {
  const r = obj(raw);
  const title = txt(r.title, MAX_TITLE);
  if (!title) return null;
  const c = obj(r.context);
  const s = obj(r.scale);
  const recuts: Partial<Record<SignalKey, string>> = {};
  for (const [k, v] of Object.entries(obj(r.recuts))) if (isSignalKey(k) && txt(v, MAX_SHORT)) recuts[k] = txt(v, MAX_SHORT);
  const defense: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj(r.defense)).slice(0, 30)) if (/^[a-z0-9-]{2,40}$/.test(k) && txt(v, MAX_ITEM)) defense[k] = txt(v, MAX_ITEM);
  const when = txt(r.when, 7);
  return {
    title,
    setting: txt(r.setting, MAX_SHORT),
    source: isOf(r.source, SOURCES) ? r.source : 'school',
    when: /^\d{4}-(0[1-9]|1[0-2])$/.test(when) ? when : '',
    tier: r.tier === 'core' ? 'core' : 'supporting',
    signals: cleanSignals(r.signals),
    context: {
      told: txt(c.told, MAX_FIELD),
      stakes: txt(c.stakes, MAX_FIELD),
      constraints: txt(c.constraints, MAX_FIELD),
      people: txt(c.people, MAX_FIELD),
      alternatives: txt(c.alternatives, MAX_FIELD),
    },
    actions: arr(r.actions, LIMITS.actions)
      .map((a) => ({ text: txt(obj(a).text, MAX_ITEM), theme: isOf(obj(a).theme, ACTION_THEMES) ? (obj(a).theme as ActionTheme) : ('' as const) }))
      .filter((a) => a.text),
    results: arr(r.results, LIMITS.results)
      .map((a) => ({ text: txt(obj(a).text, MAX_ITEM), kind: isOf(obj(a).kind, RESULT_KINDS) ? (obj(a).kind as ResultKind) : ('other' as const) }))
      .filter((a) => a.text),
    learnings: arr(r.learnings, LIMITS.learnings)
      .map((a) => ({
        text: txt(obj(a).text, MAX_ITEM),
        kind: isOf(obj(a).kind, LEARNING_KINDS) ? (obj(a).kind as LearningKind) : ('' as const),
        applied: txt(obj(a).applied, MAX_ITEM),
      }))
      .filter((a) => a.text),
    scale: {
      duration: isDuration(s.duration) ? s.duration : '',
      people: int(s.people, 0, 100_000),
      teams: int(s.teams, 0, 1000),
      contribution: int(s.contribution, 0, 5),
      impact: int(s.impact, 0, 5),
    },
    toc: arr(r.toc, LIMITS.toc)
      .map((a) => ({ theme: txt(obj(a).theme, MAX_SHORT), takeaway: txt(obj(a).takeaway, MAX_SHORT) }))
      .filter((a) => a.theme),
    tocOrder: r.tocOrder === 'chrono' ? 'chrono' : 'theme',
    followups: arr(r.followups, LIMITS.followups)
      .map((a) => ({ q: txt(obj(a).q, MAX_SHORT), a: txt(obj(a).a, MAX_ITEM) }))
      .filter((a) => a.q && a.a),
    recuts,
    defense,
    todos: cleanTodos(r.todos),
  };
}

/** Everything you would say out loud, as one string. */
export const toldText = (s: Pick<StoryInput, 'context' | 'actions' | 'results' | 'learnings'>) =>
  [s.context.told, ...s.actions.map((a) => a.text), ...s.results.map((r) => r.text), ...s.learnings.map((l) => l.text)].join(' ');

/** Months since the story happened, or null if no date. */
export function ageMonths(when: string, now: Date): number | null {
  const m = /^(\d{4})-(\d{2})$/.exec(when);
  if (!m) return null;
  return (now.getFullYear() - Number(m[1])) * 12 + (now.getMonth() + 1 - Number(m[2]));
}
