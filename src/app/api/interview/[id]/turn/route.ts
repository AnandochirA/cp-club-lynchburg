import { NextResponse } from 'next/server';
import { STAGE_IDS, type StageId } from '@/lib/interview-kit';
import { MAX_BODY_BYTES, cleanDraft } from '@/lib/interview-logic';
import { InterviewerError, turn } from '@/lib/interviewer';
import type { TurnTrigger } from '@/lib/interviewer-logic';
import { OpenAIError } from '@/lib/openai';
import { guardPost } from '@/lib/request';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TRIGGERS: TurnTrigger[] = ['question', 'stage_end', 'check'];
const STATUS = { ai_off: 403, ai_limit: 429, not_found: 404, finished: 409 } as const;
const stage = (v: unknown) => (STAGE_IDS.includes(v as StageId) ? (v as StageId) : undefined);

/**
 * POST { trigger, draft, finished?, next? }: let the AI interviewer react to
 * what you have said so far. The reply is { say, kind }; an empty `say`
 * means it chose to stay quiet.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const refused = guardPost(req);
  if (refused) return refused;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'signed_out' }, { status: 401 });
  const raw = (await ctx.params).id;
  if (!/^\d{1,15}$/.test(raw)) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) return NextResponse.json({ error: 'too_big' }, { status: 413 });
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(text);
  } catch {
    /* handled below */
  }
  const trigger = body.trigger as TurnTrigger;
  const draft = cleanDraft(body.draft);
  if (!TRIGGERS.includes(trigger) || !draft) return NextResponse.json({ error: 'bad_request' }, { status: 400 });

  try {
    const reply = await turn(session, Number(raw), trigger, draft, { finished: stage(body.finished), next: stage(body.next) });
    return NextResponse.json({ reply });
  } catch (err) {
    if (err instanceof InterviewerError) return NextResponse.json({ error: err.code }, { status: STATUS[err.code] });
    if (err instanceof OpenAIError || (err instanceof Error && err.name === 'TimeoutError')) {
      console.error('interviewer turn failed', err);
      return NextResponse.json({ error: 'ai_unavailable' }, { status: 503 });
    }
    console.error('interviewer turn failed', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
