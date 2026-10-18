import 'server-only';
import type { Problem } from '@/lib/curriculum';
import { db } from '@/lib/db';
import { PERSONAS, STAGES, stageById, type PersonaKey, type StageId } from '@/lib/interview-kit';
import { clock, findProblem, type Draft, type Metrics, type TalkStats } from '@/lib/interview-logic';
import { AI_LIMITS, type AiBrief, type AiDebrief, type TurnReply, type TurnTrigger } from '@/lib/interviewer-logic';
import { aiConfigured, speech, structured, textModel, type Usage } from '@/lib/openai';
import { cachedStatementText } from '@/lib/statement';
import type { Session } from '@/lib/session';

/**
 * The AI interviewer. It never sees your code, only what you say (the
 * browser's speech-to-text) and your notes, exactly like a phone screen
 * where you share nothing but your voice. Everything it knows about the
 * problem is in a private brief that is generated once per problem and is
 * never sent to the browser while a round is running.
 */

export class InterviewerError extends Error {
  constructor(public code: 'ai_off' | 'ai_limit' | 'not_found' | 'finished') {
    super(code);
  }
}

/** True when a key is configured and the member has AI rounds left today. */
export async function aiAllowed(session: Session): Promise<boolean> {
  if (!aiConfigured()) return false;
  const sql = db();
  const [{ n }] = (await sql`
    select count(*)::int as n from interview_sessions
    where member_id = ${session.member.id} and ai and started_at > now() - interval '1 day'
  `) as { n: number }[];
  return n < AI_LIMITS.roundsPerDay;
}

async function addUsage(id: number, u: Usage, ttsChars = 0) {
  const sql = db();
  await sql`
    update interview_sessions set ai_usage = jsonb_build_object(
      'calls', coalesce((ai_usage->>'calls')::int, 0) + ${u.input || u.output ? 1 : 0},
      'inputTokens', coalesce((ai_usage->>'inputTokens')::int, 0) + ${u.input},
      'cachedTokens', coalesce((ai_usage->>'cachedTokens')::int, 0) + ${u.cached},
      'outputTokens', coalesce((ai_usage->>'outputTokens')::int, 0) + ${u.output},
      'ttsChars', coalesce((ai_usage->>'ttsChars')::int, 0) + ${ttsChars}
    ) where id = ${id}
  `;
}

// ------------------------------------------------------------------ the brief

const str = { type: 'string' } as const;
const strs = { type: 'array', items: str } as const;
const obj = (props: Record<string, unknown>) => ({
  type: 'object',
  properties: props,
  required: Object.keys(props),
  additionalProperties: false,
});

const BRIEF_SCHEMA = obj({
  summary: str,
  keyConstraints: strs,
  clarifications: { type: 'array', items: obj({ question: str, answer: str }) },
  edgeCases: strs,
  bruteForce: obj({ approach: str, time: str, space: str }),
  optimal: obj({ approach: str, time: str, space: str }),
  pitfalls: strs,
});

/** The brief for a problem: from the cache, or written now and cached for everyone after. */
export async function briefFor(p: Problem, roundId: number): Promise<AiBrief> {
  const sql = db();
  const rows = (await sql`select brief from ai_briefs where slug = ${p.slug}`) as { brief: AiBrief }[];
  if (rows[0]) return rows[0].brief;
  const statement = await cachedStatementText(p.slug);
  const { value, usage } = await structured<AiBrief>({
    name: 'interviewer_brief',
    schema: BRIEF_SCHEMA,
    effort: 'low',
    maxOutput: 3000,
    timeoutMs: 40_000,
    instructions:
      'You are a senior engineer preparing to run a coding interview on a real LeetCode problem. Write your private interviewer brief, accurate to the actual LeetCode problem statement and constraints. ' +
      'summary: the problem in two plain sentences. keyConstraints: the real input limits and guarantees. ' +
      'clarifications: 4-6 details a strong candidate should ask about (empty input, duplicates, sortedness, output format, ties, value ranges), each with the answer you will give, true to the problem. ' +
      'edgeCases: 4-7 cases that break careless solutions. bruteForce and optimal: approach in one or two sentences, with time and space in big-O. pitfalls: 3-5 common mistakes candidates make on this problem.',
    input: `LeetCode #${p.id} "${p.title}" (leetcode.com/problems/${p.slug}), ${p.difficulty}, topic: ${p.topic}.${
      statement ? `\n\nThe statement, as LeetCode shows it:\n${statement.slice(0, 6000)}` : ''
    }`,
  });
  await sql`
    insert into ai_briefs (slug, brief, model) values (${p.slug}, ${JSON.stringify(value)}::jsonb, ${textModel()})
    on conflict (slug) do nothing
  `;
  await addUsage(roundId, usage);
  return value;
}

// ----------------------------------------------------------------- one turn

const TURN_SCHEMA = obj({
  say: str,
  kind: { type: 'string', enum: ['answer', 'pushback', 'hint', 'ack', 'none'] },
  note: str,
});

type RoundRow = {
  id: number | string;
  slug: string;
  persona: PersonaKey;
  ai: boolean;
  finished_at: Date | string | null;
  started_at: Date | string;
  ai_usage: { calls?: number; ttsChars?: number } | null;
  ai_notes: { at: string; stage: StageId; note: string }[] | null;
  mode: string;
};

async function loadRound(session: Session, id: number): Promise<RoundRow & { problem: Problem }> {
  const sql = db();
  const rows = (await sql`
    select id, slug, persona, ai, finished_at, started_at, ai_usage, ai_notes, mode
    from interview_sessions where id = ${id} and member_id = ${session.member.id}
  `) as RoundRow[];
  const r = rows[0];
  const problem = r ? findProblem(r.slug) : null;
  if (!r || !problem) throw new InterviewerError('not_found');
  if (!r.ai || !aiConfigured()) throw new InterviewerError('ai_off');
  return { ...r, problem };
}

const RULES = `You are the interviewer in a live, spoken, 45-minute coding interview. The candidate reads the problem on LeetCode and codes there. You cannot see their code: you only hear what they say (a speech-to-text transcript, so expect recognition errors and no punctuation) and see the notes they type.

How you talk:
- You are speaking out loud. At most two short sentences. Plain spoken English: no markdown, no code, no lists, no symbols like O(n^2) (say "O of n squared").
- Never reveal the solution, the optimal approach, or anything from your brief beyond what a clarifying question asks. No hints unless the candidate is clearly stuck or asks for one; then give the smallest possible nudge.
- Answer clarifying questions truthfully and briefly, from the statement, your brief, or the real LeetCode problem. If something is genuinely unspecified, pick the reasonable assumption and say it.
- Never repeat a point you already made (see your earlier lines in the transcript). If they have not reacted to it yet, stay quiet or ask a different question.
- Answer only what was asked. Do not tack a critique onto an answer to a clarifying question.

What each trigger means:
- "question": the candidate just asked you something. Answer it.
- "check": you are listening in. Stay quiet (say = "") unless there is a real reason to speak: they state a wrong complexity; they commit to an approach that will not work, or a clearly worse one without noticing; they start coding before any approach was agreed; they miss an important edge case while coding; or they are going in circles. Most checks should be silent.
- "stage_end": they just finished the step in state.finished and move on to state.next. In one or two short sentences: react to what they did (agree, or name one concrete concern), then ask for the next step in your own words. If they leave Approach with a worse-than-optimal plan, ask whether they can do better before they code.

Also return:
- kind: answer | pushback | hint | ack | none.
- note: one short private observation for your write-up about what they just did (good or bad), or "" if nothing new.

The persona below shapes your style and overrides these rules where they conflict.`;

function transcriptText(d: Draft, maxChars: number): string {
  const lines = d.transcript.map(
    (l) => `[${clock(l.at)}] (${stageById(l.stage).title}) ${l.who === 'you' ? 'Candidate' : 'Interviewer'}: ${l.text}`,
  );
  let out = '';
  for (let i = lines.length - 1; i >= 0; i--) {
    if (out.length + lines[i].length > maxChars) break;
    out = `${lines[i]}\n${out}`;
  }
  return out || '(nothing said yet)';
}

function notesText(d: Draft): string {
  const parts = STAGES.filter((s) => d.stages[s.id].notes.trim()).map((s) => `## ${s.title}\n${d.stages[s.id].notes.trim()}`);
  if (d.extras.pattern) parts.push(`## Pattern they named\n${d.extras.pattern}`);
  if (d.extras.curveAsked && d.extras.curveAnswer) parts.push(`## Their answer to the curveball\n${d.extras.curveAnswer}`);
  return parts.join('\n\n') || '(no notes)';
}

export async function turn(
  session: Session,
  id: number,
  trigger: TurnTrigger,
  d: Draft,
  ctx: { finished?: StageId; next?: StageId },
): Promise<TurnReply> {
  const r = await loadRound(session, id);
  if (r.finished_at) throw new InterviewerError('finished');
  if ((r.ai_usage?.calls ?? 0) >= AI_LIMITS.turnsPerRound) throw new InterviewerError('ai_limit');
  const [brief, statement] = await Promise.all([briefFor(r.problem, Number(r.id)), cachedStatementText(r.slug)]);
  const persona = PERSONAS[r.persona];
  const stage = d.stage === 'review' ? 'test' : d.stage;
  const elapsed = STAGES.reduce((n, s) => n + d.stages[s.id].ms, 0);
  const state = {
    trigger,
    stage: stageById(stage).title,
    stageBudgetMinutes: stageById(stage).minutes,
    stageElapsed: clock(d.stages[stage].ms),
    roundElapsed: clock(elapsed),
    finished: ctx.finished ? stageById(ctx.finished).title : undefined,
    next: ctx.next ? `${stageById(ctx.next).title}: ${stageById(ctx.next).goal}` : undefined,
    blindRound: r.mode === 'blind',
  };
  const { value, usage } = await structured<{ say: string; kind: TurnReply['kind']; note: string }>({
    name: 'interviewer_turn',
    schema: TURN_SCHEMA,
    effort: 'none',
    maxOutput: 300,
    timeoutMs: AI_LIMITS.replyTimeoutMs,
    // Static for the whole round (rules, persona, brief), so it caches; the moving parts go in input.
    instructions: `${RULES}\n\nPersona: ${persona.name}. ${persona.ai}\n\nProblem: LeetCode #${r.problem.id} "${r.problem.title}" (${r.problem.difficulty}).\n${statement ? `The statement the candidate is reading:\n${statement.slice(0, 6000)}\n` : ''}Your private brief (never reveal it):\n${JSON.stringify(brief)}`,
    input: `State: ${JSON.stringify(state)}\n\nTranscript so far:\n${transcriptText(d, 9000)}\n\nCandidate's notes:\n${notesText(d)}`,
  });
  await addUsage(Number(r.id), usage);
  if (value.note.trim()) {
    const sql = db();
    const note = { at: clock(Date.now() - new Date(r.started_at).getTime()), stage, note: value.note.trim().slice(0, 300) };
    await sql`update interview_sessions set ai_notes = ai_notes || ${JSON.stringify([note])}::jsonb where id = ${r.id}`;
  }
  return { say: value.say.trim().slice(0, 400), kind: value.kind };
}

// -------------------------------------------------------------- the debrief

const SCORE = { type: 'integer', enum: [1, 2, 3, 4] } as const;
const DEBRIEF_SCHEMA = obj({
  verdict: { type: 'string', enum: ['strong', 'lean_hire', 'lean_no', 'no_hire'] },
  scores: obj({ communication: SCORE, problemSolving: SCORE, coding: SCORE, verification: SCORE }),
  summary: str,
  strengths: strs,
  concerns: strs,
  markedDown: { anyOf: [obj({ at: str, quote: str, why: str }), { type: 'null' }] },
  clarifications: { type: 'array', items: obj({ question: str, asked: { type: 'boolean' } }) },
});

/** Write the hiring-committee write-up for a finished round. Called once, at finish. */
export async function writeDebrief(
  memberId: number,
  id: number,
  d: Draft,
  facts: { slug: string; persona: PersonaKey; mode: string; acAfterStart: boolean; metrics: Metrics | null; talk: TalkStats },
): Promise<AiDebrief | null> {
  const problem = findProblem(facts.slug);
  if (!problem || !aiConfigured()) return null;
  const sql = db();
  const [row] = (await sql`
    select ai_notes from interview_sessions where id = ${id} and member_id = ${memberId}
  `) as { ai_notes: unknown[] }[];
  const brief = await briefFor(problem, id);
  const stages = STAGES.map((s) => `${s.title}: ${d.stages[s.id].skipped ? 'skipped' : `${clock(d.stages[s.id].ms)} of ${s.minutes}:00`}`).join('; ');
  const { value, usage } = await structured<AiDebrief>({
    name: 'interviewer_debrief',
    schema: DEBRIEF_SCHEMA,
    effort: 'medium',
    maxOutput: 2500,
    timeoutMs: 45_000,
    instructions:
      'You just interviewed a candidate in a 45-minute spoken coding round. Write your hiring-committee write-up. Base it only on the evidence given: the transcript, their notes, your private notes, and the stats. Be honest and specific, and quote their own words where it helps. ' +
      'Score 1-4 on communication, problemSolving, coding, verification (1 = no hire signal, 4 = strong hire). You never saw their code: judge coding from how they described it, their pseudocode, how they handled bugs out loud, and whether LeetCode accepted it. ' +
      'verdict must agree with the scores: strong (average 3.5+), lean_hire (2.75+), lean_no (2+), no_hire. ' +
      'markedDown: the single moment that hurt them most, with its [mm:ss] time from the transcript and a short quote, or null if nothing did. ' +
      'clarifications: for each clarification in your brief, whether they asked about it or clearly handled it. summary: two or three sentences. strengths and concerns: one to four items each, concrete.',
    input: [
      `Problem: LeetCode #${problem.id} "${problem.title}" (${problem.difficulty}, ${problem.topic}). Mode: ${facts.mode}. Interviewer persona: ${PERSONAS[facts.persona].name}.`,
      `Your brief:\n${JSON.stringify(brief)}`,
      `Accepted on LeetCode during the round: ${facts.acAfterStart ? 'yes' : 'no (or not yet submitted)'}.`,
      `Time per step: ${stages}.`,
      `Talk: ${Math.round(facts.talk.talkRatio * 100)}% of the time talking, longest silence ${clock(facts.talk.longestSilenceMs)}, ${facts.talk.nudges} nudges.`,
      facts.metrics ? `Signals: ${JSON.stringify(facts.metrics)}` : 'Mic was off.',
      `Your private notes during the round: ${JSON.stringify(row?.ai_notes ?? [])}`,
      `Candidate's notes:\n${notesText(d)}`,
      `Full transcript:\n${transcriptText(d, 30_000)}`,
    ].join('\n\n'),
  });
  await addUsage(id, usage);
  await sql`update interview_sessions set ai_debrief = ${JSON.stringify(value)}::jsonb where id = ${id}`;
  return value;
}

// ----------------------------------------------------------------- the voice

/** One spoken line in the persona's voice. Capped per round so audio can't run up the bill. */
export async function voice(session: Session, id: number, text: string): Promise<Response> {
  const r = await loadRound(session, id);
  const t = text.trim().slice(0, 500);
  if ((r.ai_usage?.ttsChars ?? 0) + t.length > AI_LIMITS.ttsCharsPerRound) throw new InterviewerError('ai_limit');
  const p = PERSONAS[r.persona];
  const res = await speech(t, p.voice, p.voiceStyle);
  await addUsage(Number(r.id), { input: 0, cached: 0, output: 0 }, t.length);
  return res;
}
