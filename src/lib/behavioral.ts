import 'server-only';
import { answerChecks, answerMetrics, answerScore, goodTake, probeChecks } from '@/lib/bh/answer';
import {
  type BehavioralRound,
  type Debrief,
  type DebriefInput,
  type DrillInput,
  type Profile,
  type RoundInput,
  cleanProfile,
  debriefActions,
  defaultProfile,
} from '@/lib/bh/model';
import { type Stats, emptyStats, prepPath } from '@/lib/bh/path';
import { SCRIPTS, isKnownQuestion, questionById, valueQuestion } from '@/lib/bh/questions';
import { signalByKey, type SignalKey } from '@/lib/bh/signals';
import { MAX_STORIES, type Story, type StoryInput, cleanSignals, cleanStory, cleanTodos } from '@/lib/bh/story';
import { db } from '@/lib/db';
import type { Session } from '@/lib/session';

export class BehavioralError extends Error {
  constructor(public code: 'story_limit' | 'round_limit' | 'drill_limit' | 'debrief_limit' | 'bad_question' | 'not_found') {
    super(code);
  }
}

export const ROUNDS_PER_DAY = 80;
export const DRILLS_PER_DAY = 400;
export const MAX_DEBRIEFS = 200;

// ------------------------------------------------------------------ stories
type StoryRow = {
  id: number | string;
  title: string;
  setting: string;
  source: string;
  happened: string;
  tier: string;
  signals: string[] | null;
  context: unknown;
  actions: unknown;
  results: unknown;
  learnings: unknown;
  scale: unknown;
  toc: unknown;
  toc_order: string;
  followups: unknown;
  recuts: unknown;
  defense: unknown;
  todos: unknown;
  updated_at: Date | string;
};

/** Rows go back through the same cleaner the API uses, so the shape is always exact. */
function toStory(r: StoryRow): Story {
  const s = cleanStory({ ...r, when: r.happened, tocOrder: r.toc_order }) ?? cleanStory({ title: r.title || 'Untitled' })!;
  return { ...s, id: Number(r.id), updatedAt: new Date(r.updated_at).toISOString() };
}

export async function listStories(session: Session): Promise<Story[]> {
  const sql = db();
  const rows = (await sql`select * from stories where member_id = ${session.member.id} order by updated_at desc`) as StoryRow[];
  return rows.map(toStory);
}

/** Create a story, or update one of your own when `id` is given. */
export async function saveStory(session: Session, id: number | null, s: StoryInput): Promise<Story> {
  const sql = db();
  const j = (v: unknown) => JSON.stringify(v);
  if (id === null) {
    const [{ n }] = (await sql`select count(*)::int as n from stories where member_id = ${session.member.id}`) as { n: number }[];
    if (n >= MAX_STORIES) throw new BehavioralError('story_limit');
    const rows = (await sql`
      insert into stories (member_id, title, setting, source, happened, tier, signals, context, actions, results, learnings,
                           scale, toc, toc_order, followups, recuts, defense, todos, carl)
      values (${session.member.id}, ${s.title}, ${s.setting}, ${s.source}, ${s.when}, ${s.tier}, ${s.signals}::text[],
              ${j(s.context)}::jsonb, ${j(s.actions)}::jsonb, ${j(s.results)}::jsonb, ${j(s.learnings)}::jsonb,
              ${j(s.scale)}::jsonb, ${j(s.toc)}::jsonb, ${s.tocOrder}, ${j(s.followups)}::jsonb, ${j(s.recuts)}::jsonb,
              ${j(s.defense)}::jsonb, ${j(s.todos)}::jsonb, true)
      returning *
    `) as StoryRow[];
    return toStory(rows[0]);
  }
  const rows = (await sql`
    update stories set
      title = ${s.title}, setting = ${s.setting}, source = ${s.source}, happened = ${s.when}, tier = ${s.tier},
      signals = ${s.signals}::text[], context = ${j(s.context)}::jsonb, actions = ${j(s.actions)}::jsonb,
      results = ${j(s.results)}::jsonb, learnings = ${j(s.learnings)}::jsonb, scale = ${j(s.scale)}::jsonb,
      toc = ${j(s.toc)}::jsonb, toc_order = ${s.tocOrder}, followups = ${j(s.followups)}::jsonb,
      recuts = ${j(s.recuts)}::jsonb, defense = ${j(s.defense)}::jsonb, todos = ${j(s.todos)}::jsonb,
      carl = true, updated_at = now()
    where id = ${id} and member_id = ${session.member.id}
    returning *
  `) as StoryRow[];
  if (!rows[0]) throw new BehavioralError('not_found');
  return toStory(rows[0]);
}

export async function deleteStory(session: Session, id: number): Promise<void> {
  const sql = db();
  const rows = (await sql`delete from stories where id = ${id} and member_id = ${session.member.id} returning id`) as unknown[];
  if (rows.length === 0) throw new BehavioralError('not_found');
}

// ------------------------------------------------------------------ profile
type ProfileRow = { level: string; company_kind: string; company: string; vals: unknown; hurry: boolean; big3: unknown; tmay: unknown; asks: unknown };

export async function getProfile(session: Session): Promise<Profile> {
  const sql = db();
  const rows = (await sql`select * from bh_profile where member_id = ${session.member.id}`) as ProfileRow[];
  if (!rows[0]) return defaultProfile();
  const r = rows[0];
  return cleanProfile({ level: r.level, companyKind: r.company_kind, company: r.company, values: r.vals, hurry: r.hurry, big3: r.big3, tmay: r.tmay, asks: r.asks });
}

export async function saveProfile(session: Session, p: Profile): Promise<Profile> {
  const sql = db();
  // Big Three picks must be your own stories; anything else is quietly dropped.
  const ids = [p.big3.favoriteId, p.big3.conflictId].filter((x): x is number => x !== null);
  const own = ids.length
    ? ((await sql`select id from stories where member_id = ${session.member.id} and id = any(${ids}::bigint[])`) as { id: number | string }[]).map((r) => Number(r.id))
    : [];
  const big3 = {
    ...p.big3,
    favoriteId: p.big3.favoriteId && own.includes(p.big3.favoriteId) ? p.big3.favoriteId : null,
    conflictId: p.big3.conflictId && own.includes(p.big3.conflictId) ? p.big3.conflictId : null,
  };
  const j = (v: unknown) => JSON.stringify(v);
  await sql`
    insert into bh_profile (member_id, level, company_kind, company, vals, hurry, big3, tmay, asks, updated_at)
    values (${session.member.id}, ${p.level}, ${p.companyKind}, ${p.company}, ${j(p.values)}::jsonb, ${p.hurry},
            ${j(big3)}::jsonb, ${j(p.tmay)}::jsonb, ${j(p.asks)}::jsonb, now())
    on conflict (member_id) do update set
      level = excluded.level, company_kind = excluded.company_kind, company = excluded.company, vals = excluded.vals,
      hurry = excluded.hurry, big3 = excluded.big3, tmay = excluded.tmay, asks = excluded.asks, updated_at = now()
  `;
  return { ...p, big3 };
}

// ------------------------------------------------------------------ rounds
type RoundRow = {
  id: number | string;
  kind: string;
  question_id: string;
  qtype: string;
  story_id: number | string | null;
  answer: unknown;
  probe: unknown;
  duration_ms: number;
  mic: boolean;
  beats: unknown;
  selection: unknown;
  decode: unknown;
  clarifiers: unknown;
  persona: string;
  loop_id: string;
  script: string;
  metrics: BehavioralRound['metrics'] | null;
  checks: BehavioralRound['checks'] | null;
  score: number;
  good: boolean;
  created_at: Date | string;
};

const asArr = (v: unknown) => (Array.isArray(v) ? v : []);
const toSegs = (v: unknown) => asArr(v).map((s) => (typeof s === 'string' ? { t: 0, text: s } : (s as { t: number; text: string })));

function toRound(r: RoundRow): BehavioralRound {
  // Rounds from before the rebuild stored probe lines as plain strings.
  const probeRaw = asArr(r.probe);
  const probes = probeRaw.length && typeof probeRaw[0] === 'string' ? [{ text: '', level: 'leaf' as const, lines: toSegs(probeRaw), durationMs: 0 }] : (probeRaw as BehavioralRound['probes']);
  return {
    id: Number(r.id),
    kind: (r.kind as BehavioralRound['kind']) ?? 'question',
    questionId: r.question_id,
    qtype: (r.qtype as BehavioralRound['qtype']) ?? 'time',
    storyId: r.story_id === null ? null : Number(r.story_id),
    segments: toSegs(r.answer),
    probes,
    durationMs: r.duration_ms,
    mic: r.mic,
    beats: asArr(r.beats) as BehavioralRound['beats'],
    selection: (r.selection as BehavioralRound['selection']) ?? null,
    decode: (r.decode as BehavioralRound['decode']) ?? null,
    clarifiers: (r.clarifiers as BehavioralRound['clarifiers']) ?? { asked: 0, good: 0 },
    persona: (r.persona as BehavioralRound['persona']) ?? 'none',
    loopId: r.loop_id ?? '',
    script: r.script ?? '',
    metrics: r.metrics as BehavioralRound['metrics'],
    checks: r.checks ?? [],
    score: r.score ?? 0,
    good: !!r.good,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

/** The signal areas a question scores; company-value questions come from the member's own value map. */
function questionSignals(questionId: string, profile: Profile): SignalKey[] {
  const q = questionById(questionId);
  if (q) return q.signals;
  const m = /^val-(\d{1,2})$/.exec(questionId);
  if (m) {
    const v = profile.values[Number(m[1])];
    return v ? valueQuestion(v.name, v.signals, Number(m[1])).signals : ['ownership'];
  }
  return [];
}

/** Save a finished answer. Every metric and check is computed here, never taken from the browser. */
export async function saveRound(session: Session, input: RoundInput): Promise<BehavioralRound> {
  if (!isKnownQuestion(input.questionId)) throw new BehavioralError('bad_question');
  const sql = db();
  const [{ n }] = (await sql`
    select count(*)::int as n from behavioral_rounds where member_id = ${session.member.id} and created_at > now() - interval '1 day'
  `) as { n: number }[];
  if (n >= ROUNDS_PER_DAY) throw new BehavioralError('round_limit');
  let storyId = input.storyId;
  let storySignals: SignalKey[] = [];
  if (storyId !== null) {
    const own = (await sql`select signals from stories where id = ${storyId} and member_id = ${session.member.id}`) as { signals: string[] | null }[];
    if (own.length === 0) storyId = null;
    else storySignals = cleanSignals(own[0].signals);
  }
  const profile = await getProfile(session);
  // A rehearsal is scored against the story's own signal areas.
  const signals = input.questionId === 'rehearse' ? storySignals : questionSignals(input.questionId, profile);
  const qtype = questionById(input.questionId)?.type ?? input.qtype;
  const metrics = answerMetrics({ qtype, signals, segments: input.segments, beats: input.beats, durationMs: input.durationMs, mic: input.mic, clarifiers: input.clarifiers });
  const checks = [...answerChecks(metrics, qtype, signals), ...probeChecks(input.probes)];
  const score = answerScore(checks);
  const good = goodTake(metrics, qtype);
  const j = (v: unknown) => JSON.stringify(v);
  const rows = (await sql`
    insert into behavioral_rounds (member_id, kind, question_id, qtype, story_id, answer, probe, duration_ms, mic, star, beats,
                                   selection, decode, clarifiers, persona, loop_id, script, metrics, checks, score, good)
    values (${session.member.id}, ${input.kind}, ${input.questionId}, ${qtype}, ${storyId}, ${j(input.segments)}::jsonb,
            ${j(input.probes)}::jsonb, ${input.durationMs}, ${input.mic}, '{}'::jsonb, ${j(input.beats)}::jsonb,
            ${input.selection ? j(input.selection) : null}::jsonb, ${input.decode ? j(input.decode) : null}::jsonb,
            ${j(input.clarifiers)}::jsonb, ${input.persona}, ${input.loopId}, ${input.script}, ${j(metrics)}::jsonb,
            ${j(checks)}::jsonb, ${score}, ${good})
    returning *
  `) as RoundRow[];
  // The pick and the signal-spotting inside a full question count toward the drills too.
  if (input.selection)
    await sql`insert into bh_drills (member_id, kind, question_id, correct, ms, detail)
              values (${session.member.id}, 'select', ${input.questionId}, ${input.selection.grade === 'best' || input.selection.grade === 'close'},
                      ${input.selection.ms}, ${j({ grade: input.selection.grade, picked: input.selection.pickedId ? [input.selection.pickedId] : [] })}::jsonb)`;
  if (input.decode)
    await sql`insert into bh_drills (member_id, kind, question_id, correct, ms, detail)
              values (${session.member.id}, 'decode', ${input.questionId}, ${input.decode.correct}, 0, ${j({ picked: input.decode.picked })}::jsonb)`;
  return toRound(rows[0]);
}

export async function listRounds(session: Session, limit = 20): Promise<BehavioralRound[]> {
  const sql = db();
  const rows = (await sql`
    select * from behavioral_rounds where member_id = ${session.member.id} order by created_at desc limit ${limit}
  `) as RoundRow[];
  return rows.map(toRound);
}

// ------------------------------------------------------------------ drills
export async function saveDrill(session: Session, d: DrillInput): Promise<void> {
  if (!isKnownQuestion(d.questionId)) throw new BehavioralError('bad_question');
  const sql = db();
  const [{ n }] = (await sql`
    select count(*)::int as n from bh_drills where member_id = ${session.member.id} and created_at > now() - interval '1 day'
  `) as { n: number }[];
  if (n >= DRILLS_PER_DAY) throw new BehavioralError('drill_limit');
  await sql`insert into bh_drills (member_id, kind, question_id, correct, ms, detail)
            values (${session.member.id}, ${d.kind}, ${d.questionId}, ${d.correct}, ${d.ms}, ${JSON.stringify(d.detail)}::jsonb)`;
}

/** Everything the Prep Path reads, aggregated in the database. */
export async function prepStats(session: Session): Promise<Stats> {
  const sql = db();
  const id = session.member.id;
  const [takes, tmay, decode, select, scripts, counts] = (await Promise.all([
    sql`select story_id, count(*)::int as n from behavioral_rounds
        where member_id = ${id} and good and story_id is not null and kind in ('rehearse', 'question', 'loop') group by story_id`,
    sql`select count(*)::int as n from behavioral_rounds where member_id = ${id} and good and qtype = 'tmay'`,
    sql`select count(*)::int as answered, count(*) filter (where correct)::int as correct
        from (select correct from bh_drills where member_id = ${id} and kind = 'decode' order by created_at desc limit 20) d`,
    sql`select count(*)::int as answered, coalesce(avg(ms), 0)::int as avg_ms, count(*) filter (where detail->>'grade' = 'best')::int as best
        from (select ms, detail from bh_drills where member_id = ${id} and kind = 'select' order by created_at desc limit 20) d`,
    sql`select script, loop_id, count(distinct question_id)::int as n from behavioral_rounds
        where member_id = ${id} and script <> '' group by script, loop_id`,
    sql`select count(*)::int as rounds,
               count(distinct loop_id) filter (where loop_id <> '')::int as loops,
               count(*) filter (where checks @> '[{"key":"split","grade":"good"}]'::jsonb)::int as split_ok
        from behavioral_rounds where member_id = ${id}`,
  ])) as [
    { story_id: number | string; n: number }[],
    { n: number }[],
    { answered: number; correct: number }[],
    { answered: number; avg_ms: number; best: number }[],
    { script: string; loop_id: string; n: number }[],
    { rounds: number; loops: number; split_ok: number }[],
  ];
  const done = new Set(scripts.filter((r) => r.n >= (SCRIPTS.find((s) => s.id === r.script)?.questions.length ?? Infinity)).map((r) => r.script));
  return {
    ...emptyStats(),
    goodTakes: Object.fromEntries(takes.map((t) => [Number(t.story_id), t.n])),
    tmayGood: tmay[0].n,
    decode: decode[0],
    select: { answered: select[0].answered, avgMs: select[0].avg_ms, best: select[0].best },
    scripts: [...done],
    loops: counts[0].loops,
    splitOk: counts[0].split_ok,
    rounds: counts[0].rounds,
  };
}

// ------------------------------------------------------------------ debriefs
type DebriefRow = {
  id: number | string;
  company: string;
  round_kind: string;
  happened: string;
  questions: Debrief['questions'];
  engagement: Debrief['engagement'];
  stories_told: number;
  rushed: boolean;
  early: boolean;
  notes: string;
  created_at: Date | string;
};
const toDebrief = (r: DebriefRow): Debrief => ({
  id: Number(r.id),
  company: r.company,
  roundKind: r.round_kind,
  when: r.happened,
  questions: r.questions ?? [],
  engagement: r.engagement,
  storiesTold: r.stories_told,
  rushed: r.rushed,
  early: r.early,
  notes: r.notes,
  createdAt: new Date(r.created_at).toISOString(),
});

export async function listDebriefs(session: Session): Promise<Debrief[]> {
  const sql = db();
  const rows = (await sql`select * from bh_debriefs where member_id = ${session.member.id} order by created_at desc limit 50`) as DebriefRow[];
  return rows.map(toDebrief);
}

/**
 * Save a debrief and turn it into to-dos: on the stories it involved, or on
 * the newest story as a reminder to mine a new one when nothing fit.
 */
export async function saveDebrief(session: Session, d: DebriefInput): Promise<{ debrief: Debrief; touched: Story[] }> {
  const sql = db();
  const [{ n }] = (await sql`select count(*)::int as n from bh_debriefs where member_id = ${session.member.id}`) as { n: number }[];
  if (n >= MAX_DEBRIEFS) throw new BehavioralError('debrief_limit');
  const stories = await listStories(session);
  const rows = (await sql`
    insert into bh_debriefs (member_id, company, round_kind, happened, questions, engagement, stories_told, rushed, early, notes)
    values (${session.member.id}, ${d.company}, ${d.roundKind}, ${d.when}, ${JSON.stringify(d.questions)}::jsonb, ${d.engagement},
            ${d.storiesTold}, ${d.rushed}, ${d.early}, ${d.notes})
    returning *
  `) as DebriefRow[];
  const debrief = toDebrief(rows[0]);
  const actions = debriefActions(d, stories);
  const byStory = new Map<number, string[]>();
  for (const a of actions) if (a.storyId) byStory.set(a.storyId, [...(byStory.get(a.storyId) ?? []), a.text]);
  const touched: Story[] = [];
  const at = new Date().toISOString();
  for (const [sid, texts] of byStory) {
    const s = stories.find((x) => x.id === sid);
    if (!s) continue;
    const todos = cleanTodos([...texts.map((text, i) => ({ id: `d${debrief.id}-${i}`, text, done: false, at })), ...s.todos]);
    const { id: _id, updatedAt: _u, ...input } = s;
    touched.push(await saveStory(session, sid, { ...input, todos }));
  }
  return { debrief, touched };
}

export async function deleteDebrief(session: Session, id: number): Promise<void> {
  const sql = db();
  const rows = (await sql`delete from bh_debriefs where id = ${id} and member_id = ${session.member.id} returning id`) as unknown[];
  if (rows.length === 0) throw new BehavioralError('not_found');
}

// ------------------------------------------------------------------ everything at once
export async function behavioralState(session: Session) {
  const [stories, profile, rounds, stats, debriefs] = await Promise.all([
    listStories(session),
    getProfile(session),
    listRounds(session),
    prepStats(session),
    listDebriefs(session),
  ]);
  return { stories, profile, rounds, stats, debriefs };
}
export type BehavioralState = Awaited<ReturnType<typeof behavioralState>>;

/**
 * The Arena's behavioral door: readiness, the next step, and signal-area
 * coverage. Null (door hidden) if the behavioral tables are not migrated yet,
 * so the Arena never breaks on them.
 */
export async function behavioralDoor(session: Session) {
  try {
    const { stories, profile, stats, debriefs } = await behavioralState(session);
    const p = prepPath(stories, profile, stats, debriefs.length, new Date());
    return {
      stories: stories.length,
      covered: p.coverage.covered.map((k) => signalByKey(k).title),
      gaps: p.coverage.gaps.map((k) => signalByKey(k).title),
      rounds: stats.rounds,
      readiness: p.readiness,
      next: p.next ? p.next.title : null,
    };
  } catch (err) {
    console.error('behavioral door failed (has db/schema.sql been applied?)', err);
    return null;
  }
}
