import 'server-only';
import { competencyByKey, questionById } from '@/lib/behavioral-kit';
import {
  MAX_STORIES,
  ROUNDS_PER_DAY,
  answerMetrics,
  coverage,
  type BehavioralRound,
  type RoundInput,
  type Story,
  type StoryInput,
} from '@/lib/behavioral-logic';
import { db } from '@/lib/db';
import type { Session } from '@/lib/session';

export class BehavioralError extends Error {
  constructor(public code: 'story_limit' | 'round_limit' | 'bad_question' | 'not_found') {
    super(code);
  }
}

type StoryRow = {
  id: number | string;
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  tags: Story['tags'] | null;
  updated_at: Date | string;
};

const toStory = (r: StoryRow): Story => ({
  id: Number(r.id),
  title: r.title,
  situation: r.situation,
  task: r.task,
  action: r.action,
  result: r.result,
  tags: r.tags ?? [],
  updatedAt: new Date(r.updated_at).toISOString(),
});

export async function listStories(session: Session): Promise<Story[]> {
  const sql = db();
  const rows = (await sql`
    select * from stories where member_id = ${session.member.id} order by updated_at desc
  `) as StoryRow[];
  return rows.map(toStory);
}

/** Create a story, or update one of your own when `id` is given. */
export async function saveStory(session: Session, id: number | null, s: StoryInput): Promise<Story> {
  const sql = db();
  if (id === null) {
    const [{ n }] = (await sql`select count(*)::int as n from stories where member_id = ${session.member.id}`) as { n: number }[];
    if (n >= MAX_STORIES) throw new BehavioralError('story_limit');
    const rows = (await sql`
      insert into stories (member_id, title, situation, task, action, result, tags)
      values (${session.member.id}, ${s.title}, ${s.situation}, ${s.task}, ${s.action}, ${s.result}, ${s.tags}::text[])
      returning *
    `) as StoryRow[];
    return toStory(rows[0]);
  }
  const rows = (await sql`
    update stories
    set title = ${s.title}, situation = ${s.situation}, task = ${s.task}, action = ${s.action},
        result = ${s.result}, tags = ${s.tags}::text[], updated_at = now()
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

type RoundRow = {
  id: number | string;
  question_id: string;
  story_id: number | string | null;
  answer: string[];
  probe: string[];
  duration_ms: number;
  mic: boolean;
  star: BehavioralRound['star'];
  metrics: BehavioralRound['metrics'];
  created_at: Date | string;
};

const toRound = (r: RoundRow): BehavioralRound => ({
  id: Number(r.id),
  questionId: r.question_id,
  storyId: r.story_id === null ? null : Number(r.story_id),
  answer: r.answer,
  probe: r.probe,
  durationMs: r.duration_ms,
  mic: r.mic,
  star: r.star,
  metrics: r.metrics,
  createdAt: new Date(r.created_at).toISOString(),
});

/** Save a finished answer. The signals are computed here, never taken from the browser. */
export async function saveRound(session: Session, input: RoundInput): Promise<BehavioralRound> {
  if (!questionById(input.questionId)) throw new BehavioralError('bad_question');
  const sql = db();
  const [{ n }] = (await sql`
    select count(*)::int as n from behavioral_rounds
    where member_id = ${session.member.id} and created_at > now() - interval '1 day'
  `) as { n: number }[];
  if (n >= ROUNDS_PER_DAY) throw new BehavioralError('round_limit');
  // A story id that is not yours is quietly dropped rather than linked.
  let storyId = input.storyId;
  if (storyId !== null) {
    const own = (await sql`select 1 from stories where id = ${storyId} and member_id = ${session.member.id}`) as unknown[];
    if (own.length === 0) storyId = null;
  }
  const metrics = answerMetrics(input);
  const rows = (await sql`
    insert into behavioral_rounds (member_id, question_id, story_id, answer, probe, duration_ms, mic, star, metrics)
    values (${session.member.id}, ${input.questionId}, ${storyId}, ${JSON.stringify(input.answer)}::jsonb,
            ${JSON.stringify(input.probe)}::jsonb, ${input.durationMs}, ${input.mic},
            ${JSON.stringify(input.star)}::jsonb, ${JSON.stringify(metrics)}::jsonb)
    returning *
  `) as RoundRow[];
  return toRound(rows[0]);
}

export async function listRounds(session: Session, limit = 12): Promise<BehavioralRound[]> {
  const sql = db();
  const rows = (await sql`
    select * from behavioral_rounds where member_id = ${session.member.id}
    order by created_at desc limit ${limit}
  `) as RoundRow[];
  return rows.map(toRound);
}

/** The Arena's behavioral door: story count, which competencies are covered, round count. */
export async function behavioralDoor(session: Session) {
  const sql = db();
  const [stories, counts] = (await Promise.all([
    sql`select tags from stories where member_id = ${session.member.id}`,
    sql`select count(*)::int as n from behavioral_rounds where member_id = ${session.member.id}`,
  ])) as [{ tags: Story['tags'] }[], { n: number }[]];
  const c = coverage(stories);
  return {
    stories: stories.length,
    covered: c.covered.map((k) => competencyByKey(k).title),
    gaps: c.gaps.map((k) => competencyByKey(k).title),
    rounds: counts[0].n,
  };
}
