import 'server-only';
import { db } from '@/lib/db';
import {
  RESUME_HOURS,
  STARTS_PER_DAY,
  cleanDraft,
  emptyDraft,
  findProblem,
  talkStats,
  type Draft,
  type Scores,
  type TalkStats,
} from '@/lib/interview-logic';
import type { Session } from '@/lib/session';

/** One mock interview, as the browser sees it. */
export type InterviewRecord = {
  id: number;
  slug: string;
  startedAt: string;
  finishedAt: string | null;
  draft: Draft;
  scores: Scores | null;
  talkStats: TalkStats | null;
  acAfterStart: boolean;
};

/** The short form the dashboard lists. */
export type InterviewSummary = Omit<InterviewRecord, 'draft'>;

export class InterviewError extends Error {
  constructor(public code: 'bad_problem' | 'interview_limit' | 'not_found' | 'too_big' | 'bad_request') {
    super(code);
  }
}

type Row = {
  id: number | string;
  slug: string;
  started_at: Date | string;
  finished_at: Date | string | null;
  stage: string;
  stages: Draft['stages'];
  transcript: Draft['transcript'];
  mic: boolean;
  scores: Scores | null;
  talk_stats: TalkStats | null;
  ac_after_start: boolean;
};

const iso = (v: Date | string) => new Date(v).toISOString();

function toRecord(r: Row): InterviewRecord {
  // Rows are only ever written through cleanDraft, so this re-check is cheap insurance, not validation.
  const draft = cleanDraft({ stage: r.stage, stages: r.stages, transcript: r.transcript, mic: r.mic }) ?? emptyDraft();
  return {
    id: Number(r.id),
    slug: r.slug,
    startedAt: iso(r.started_at),
    finishedAt: r.finished_at ? iso(r.finished_at) : null,
    draft,
    scores: r.scores,
    talkStats: r.talk_stats,
    acAfterStart: r.ac_after_start,
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

export async function startInterview(session: Session, slug: string): Promise<InterviewRecord> {
  if (!findProblem(slug)) throw new InterviewError('bad_problem');
  const sql = db();
  const [{ n }] = (await sql`
    select count(*)::int as n from interview_sessions
    where member_id = ${session.member.id} and started_at > now() - interval '1 day'
  `) as { n: number }[];
  if (n >= STARTS_PER_DAY) throw new InterviewError('interview_limit');
  const d = emptyDraft();
  const rows = (await sql`
    insert into interview_sessions (member_id, slug, stage, stages, transcript)
    values (${session.member.id}, ${slug}, ${d.stage}, ${JSON.stringify(d.stages)}::jsonb, ${JSON.stringify(d.transcript)}::jsonb)
    returning *
  `) as Row[];
  return toRecord(rows[0]);
}

export async function getInterview(session: Session, id: number): Promise<InterviewRecord> {
  const sql = db();
  const rows = (await sql`
    select * from interview_sessions where id = ${id} and member_id = ${session.member.id}
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
        transcript = ${JSON.stringify(d.transcript)}::jsonb, mic = ${d.mic}, updated_at = now()
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
 * Close a session out: freeze the draft, compute talk stats here (not trusted
 * from the client), and look for an Accepted since it started. Calling it on
 * an already finished session only updates the scores and the AC check, so
 * "Save scores" and "Check again" can reuse it.
 */
export async function finishInterview(
  session: Session,
  id: number,
  raw: unknown,
  scores: Scores | null,
): Promise<InterviewRecord> {
  const current = await getInterview(session, id);
  const sql = db();
  const ac = await acSince(session.member.id, current.slug, current.startedAt);
  if (!current.finishedAt) {
    const d = cleanDraft(raw) ?? current.draft;
    d.stage = 'review';
    await sql`
      update interview_sessions
      set stage = 'review', stages = ${JSON.stringify(d.stages)}::jsonb,
          transcript = ${JSON.stringify(d.transcript)}::jsonb, mic = ${d.mic},
          talk_stats = ${JSON.stringify(talkStats(d))}::jsonb,
          scores = ${scores ? JSON.stringify(scores) : null}::jsonb,
          ac_after_start = ${ac}, finished_at = now(), updated_at = now()
      where id = ${id} and member_id = ${session.member.id}
    `;
  } else {
    await sql`
      update interview_sessions
      set scores = coalesce(${scores ? JSON.stringify(scores) : null}::jsonb, scores),
          ac_after_start = ${ac}, updated_at = now()
      where id = ${id} and member_id = ${session.member.id}
    `;
  }
  return getInterview(session, id);
}

/** Finished sessions, newest first, for the dashboard card. */
export async function listInterviews(session: Session, limit = 20): Promise<InterviewSummary[]> {
  const sql = db();
  const rows = (await sql`
    select id, slug, started_at, finished_at, scores, talk_stats, ac_after_start
    from interview_sessions
    where member_id = ${session.member.id} and finished_at is not null
    order by started_at desc limit ${limit}
  `) as Row[];
  return rows.map((r) => ({
    id: Number(r.id),
    slug: r.slug,
    startedAt: iso(r.started_at),
    finishedAt: r.finished_at ? iso(r.finished_at) : null,
    scores: r.scores,
    talkStats: r.talk_stats,
    acAfterStart: r.ac_after_start,
  }));
}
