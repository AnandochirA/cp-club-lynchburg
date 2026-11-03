import 'server-only';
import { RANK_KEYS, curriculum } from '@/lib/curriculum';
import { db } from '@/lib/db';
import { curveballsFor } from '@/lib/interview-kit';
import {
  RESUME_HOURS,
  MAX_NEXT_TIME,
  STARTS_PER_DAY,
  arenaSummary,
  cleanDraft,
  emptyDraft,
  emptyExtras,
  findProblem,
  pick,
  talkStats,
  transcriptMetrics,
  type Arena,
  type Draft,
  type Extras,
  type Metrics,
  type MistakeKey,
  type Mode,
  type RoundFacts,
  type Scores,
  type TalkStats,
} from '@/lib/interview-logic';
import { calibrationTrend } from '@/lib/film';
import { rankIndex } from '@/lib/progress';
import type { Session } from '@/lib/session';

/** One mock interview, as the browser sees it. */
export type InterviewRecord = {
  id: number;
  slug: string;
  mode: Mode;
  startedAt: string;
  finishedAt: string | null;
  draft: Draft;
  scores: Scores | null;
  talkStats: TalkStats | null;
  acAfterStart: boolean;
  metrics: Metrics | null;
  mistakes: MistakeKey[];
  nextTime: string | null;
};

/** What the member adds after the round. */
export type PostMortem = { scores: Scores | null; mistakes: MistakeKey[] | null; nextTime: string | null };

export class InterviewError extends Error {
  constructor(public code: 'bad_problem' | 'interview_limit' | 'not_found' | 'too_big' | 'bad_request') {
    super(code);
  }
}

type Row = {
  id: number | string;
  slug: string;
  mode: Mode;
  started_at: Date | string;
  finished_at: Date | string | null;
  stage: string;
  stages: Draft['stages'];
  transcript: Draft['transcript'];
  mic: boolean;
  scores: Scores | null;
  talk_stats: TalkStats | null;
  ac_after_start: boolean;
  metrics: Metrics | null;
  mistakes: MistakeKey[] | null;
  next_time: string | null;
  extras: Extras | null;
};

const iso = (v: Date | string) => new Date(v).toISOString();

function toRecord(r: Row): InterviewRecord {
  // Rows are only ever written through cleanDraft, so this re-check is cheap insurance, not validation.
  const draft =
    cleanDraft({ stage: r.stage, stages: r.stages, transcript: r.transcript, mic: r.mic, extras: r.extras }) ?? emptyDraft();
  return {
    id: Number(r.id),
    slug: r.slug,
    mode: r.mode ?? 'practice',
    startedAt: iso(r.started_at),
    finishedAt: r.finished_at ? iso(r.finished_at) : null,
    draft,
    scores: r.scores,
    talkStats: r.talk_stats,
    acAfterStart: r.ac_after_start,
    metrics: r.metrics ?? null,
    mistakes: r.mistakes ?? [],
    nextTime: r.next_time ?? null,
  };
}

/** The member's unfinished session on this problem, if a recent one exists. */
export async function findResumable(session: Session, slug: string): Promise<InterviewRecord | null> {
  const sql = db();
  const rows = (await sql`
    select * from interview_sessions
    where member_id = ${session.member.id} and slug = ${slug} and finished_at is null
      and started_at > now() - ${`${RESUME_HOURS} hours`}::interval
    order by started_at desc limit 1
  `) as Row[];
  return rows[0] ? toRecord(rows[0]) : null;
}

export type StartOptions = { mode: Mode; extras: Extras };

/** Start a round. `extras` carries the curveball. */
export async function startInterview(session: Session, slug: string, o: StartOptions): Promise<InterviewRecord> {
  if (!findProblem(slug)) throw new InterviewError('bad_problem');
  const sql = db();
  const [{ n }] = (await sql`
    select count(*)::int as n from interview_sessions
    where member_id = ${session.member.id} and started_at > now() - interval '1 day'
  `) as { n: number }[];
  if (n >= STARTS_PER_DAY) throw new InterviewError('interview_limit');
  const d = emptyDraft();
  d.extras = o.extras;
  const rows = (await sql`
    insert into interview_sessions (member_id, slug, mode, stage, stages, transcript, extras)
    values (${session.member.id}, ${slug}, ${o.mode}, ${d.stage}, ${JSON.stringify(d.stages)}::jsonb,
            ${JSON.stringify(d.transcript)}::jsonb, ${JSON.stringify(o.extras)}::jsonb)
    returning *
  `) as Row[];
  return toRecord(rows[0]);
}

/** Blind draws: mostly Mediums, sometimes a Hard, like a real loop. */
const HARD_SHARE = 0.2;
const BLIND_FRESH_DAYS = 30;

/**
 * Pick a blind problem on the server, so the browser never sees the pool.
 * Unsolved, not practiced in the last 30 days, from your rank's set or the
 * one above. Each filter is dropped in turn if it would leave nothing.
 */
export async function pickBlind(session: Session): Promise<string> {
  const sql = db();
  const [solvedRows, recentRows] = (await Promise.all([
    sql`select distinct slug from ac_events where member_id = ${session.member.id} and revoked_at is null`,
    sql`
      select distinct slug from interview_sessions
      where member_id = ${session.member.id} and started_at > now() - ${`${BLIND_FRESH_DAYS} days`}::interval
    `,
  ])) as { slug: string }[][];
  const solved = new Set(solvedRows.map((r) => r.slug));
  const recent = new Set(recentRows.map((r) => r.slug));
  const reach = RANK_KEYS.slice(0, Math.min(rankIndex(session.member.rank) + 2, RANK_KEYS.length));
  const all = reach.flatMap((k) => curriculum[k]);
  const pools = [
    all.filter((p) => !solved.has(p.slug) && !recent.has(p.slug)),
    all.filter((p) => !recent.has(p.slug)),
    all,
  ];
  const pool = pools.find((p) => p.length > 0)!;
  const want = Math.random() < HARD_SHARE ? 'Hard' : 'Medium';
  const fit = pool.filter((p) => p.difficulty === want);
  return pick(fit.length ? fit : pool).slug;
}

/** Blind rounds always get a curveball; the others get one about half the time. */
export function startExtras(slug: string, mode: Mode) {
  const x = emptyExtras();
  const p = findProblem(slug);
  if (p && (mode === 'blind' || Math.random() < 0.5)) x.curveball = pick(curveballsFor(p.topic));
  return x;
}

/** The "next time I will…" line from the member's latest round that has one. */
export async function lastNextTime(session: Session): Promise<string | null> {
  const sql = db();
  const rows = (await sql`
    select next_time from interview_sessions
    where member_id = ${session.member.id} and finished_at is not null and coalesce(next_time, '') <> ''
    order by finished_at desc limit 1
  `) as { next_time: string }[];
  return rows[0]?.next_time ?? null;
}

export async function getInterview(session: Session, id: number): Promise<InterviewRecord> {
  const sql = db();
  const rows = (await sql`
    select * from interview_sessions
    where id = ${id} and member_id = ${session.member.id}
  `) as Row[];
  if (!rows[0]) throw new InterviewError('not_found');
  return toRecord(rows[0]);
}

/** Autosave. A finished session's draft is frozen. */
export async function saveInterview(session: Session, id: number, raw: unknown): Promise<void> {
  const d = cleanDraft(raw);
  if (!d) throw new InterviewError('bad_request');
  const sql = db();
  const rows = (await sql`
    update interview_sessions
    set stage = ${d.stage}, stages = ${JSON.stringify(d.stages)}::jsonb,
        transcript = ${JSON.stringify(d.transcript)}::jsonb, mic = ${d.mic},
        extras = ${JSON.stringify(d.extras)}::jsonb, updated_at = now()
    where id = ${id} and member_id = ${session.member.id} and finished_at is null
    returning id
  `) as { id: number }[];
  if (!rows[0]) throw new InterviewError('not_found');
}

async function acSince(memberId: number, slug: string, startedAt: string): Promise<boolean> {
  const sql = db();
  const rows = (await sql`
    select 1 from ac_events
    where member_id = ${memberId} and slug = ${slug} and ts >= ${startedAt}::timestamptz and revoked_at is null
    limit 1
  `) as unknown[];
  return rows.length > 0;
}

/**
 * Close a session out: freeze the draft, compute talk stats and transcript
 * metrics here (never trusted from the client), and look for an Accepted
 * since it started. Calling it on an already finished session only updates
 * the post-mortem and the AC check, so "Lock in verdict" and "Check again"
 * reuse it. A null field in `pm` leaves that field as it was.
 */
export async function finishInterview(session: Session, id: number, raw: unknown, pm: PostMortem): Promise<InterviewRecord> {
  const current = await getInterview(session, id);
  const sql = db();
  const ac = await acSince(session.member.id, current.slug, current.startedAt);
  const scores = pm.scores ? JSON.stringify(pm.scores) : null;
  const nextTime = pm.nextTime === null ? null : pm.nextTime.trim().slice(0, MAX_NEXT_TIME);
  if (!current.finishedAt) {
    const d = cleanDraft(raw) ?? current.draft;
    d.stage = 'review';
    await sql`
      update interview_sessions
      set stage = 'review', stages = ${JSON.stringify(d.stages)}::jsonb,
          transcript = ${JSON.stringify(d.transcript)}::jsonb, mic = ${d.mic},
          extras = ${JSON.stringify(d.extras)}::jsonb,
          talk_stats = ${JSON.stringify(talkStats(d))}::jsonb,
          metrics = ${JSON.stringify(transcriptMetrics(d))}::jsonb,
          scores = ${scores}::jsonb,
          ac_after_start = ${ac}, finished_at = now(), updated_at = now()
      where id = ${id} and member_id = ${session.member.id}
    `;
  }
  await sql`
    update interview_sessions
    set scores = coalesce(${scores}::jsonb, scores),
        mistakes = coalesce(${pm.mistakes}::text[], mistakes),
        next_time = coalesce(${nextTime}, next_time),
        ac_after_start = ${ac}, updated_at = now()
    where id = ${id} and member_id = ${session.member.id}
  `;
  return getInterview(session, id);
}

/** Everything the dashboard's Arena shows, derived from the member's finished rounds. */
export async function arenaFor(session: Session): Promise<Arena> {
  const sql = db();
  const rows = (await sql`
    select id, slug, mode, finished_at, ac_after_start, scores, talk_stats, mistakes, metrics,
           coalesce(extras->>'pattern', '') as pattern
    from interview_sessions
    where member_id = ${session.member.id} and finished_at is not null
    order by finished_at desc limit 400
  `) as (Pick<Row, 'id' | 'slug' | 'mode' | 'ac_after_start' | 'scores' | 'talk_stats' | 'mistakes' | 'metrics'> & {
    finished_at: Date | string;
    pattern: string;
  })[];
  const facts: RoundFacts[] = rows.map((r) => ({
    id: Number(r.id),
    slug: r.slug,
    mode: r.mode,
    finishedAt: iso(r.finished_at),
    acAfterStart: r.ac_after_start,
    scores: r.scores,
    talkStats: r.talk_stats,
    mistakes: r.mistakes ?? [],
    pattern: r.pattern,
    metrics: r.metrics,
  }));
  const acs = (await sql`
    select slug, ts from ac_events where member_id = ${session.member.id} and revoked_at is null
  `) as { slug: string; ts: Date | string }[];
  const solves = new Map<string, number[]>();
  for (const a of acs) solves.set(a.slug, [...(solves.get(a.slug) ?? []), new Date(a.ts).getTime()]);
  // A review of an old solution counts like a solve: it passes the current redo box.
  const reviews = (await sql`
    select slug, reviewed_at from problem_reviews where member_id = ${session.member.id}
  `) as { slug: string; reviewed_at: Date | string }[];
  for (const r of reviews) solves.set(r.slug, [...(solves.get(r.slug) ?? []), new Date(r.reviewed_at).getTime()]);
  return { ...arenaSummary(facts, Date.now(), solves), calibration: calibrationTrend(facts) };
}

/**
 * "Mark reviewed": the member looked over their old solution instead of solving
 * the problem again. Only allowed for a problem they have solved and that is due
 * in the redo queue, so it cannot be used to skip ahead.
 */
export async function markReviewed(session: Session, slug: string): Promise<void> {
  if (!findProblem(slug)) throw new InterviewError('bad_problem');
  const sql = db();
  const solved = (await sql`
    select 1 from ac_events where member_id = ${session.member.id} and slug = ${slug} and revoked_at is null limit 1
  `) as unknown[];
  if (solved.length === 0) throw new InterviewError('bad_request');
  const arena = await arenaFor(session);
  if (!arena.redo.due.some((d) => d.slug === slug)) throw new InterviewError('bad_request');
  await sql`insert into problem_reviews (member_id, slug) values (${session.member.id}, ${slug})`;
}
