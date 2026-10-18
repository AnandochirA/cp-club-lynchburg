import { NextResponse } from 'next/server';
import { InterviewError, finishInterview, getInterview, saveInterview } from '@/lib/interview';
import { MAX_BODY_BYTES, cleanScores } from '@/lib/interview-logic';
import { guardPost } from '@/lib/request';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATUS: Record<InterviewError['code'], number> = {
  bad_problem: 400,
  bad_request: 400,
  interview_limit: 429,
  not_found: 404,
  too_big: 413,
};

function fail(err: unknown, what: string) {
  if (err instanceof InterviewError) return NextResponse.json({ error: err.code }, { status: STATUS[err.code] });
  console.error(`interview ${what} failed`, err);
  return NextResponse.json({ error: 'server' }, { status: 500 });
}

const parseId = (raw: string) => (/^\d{1,15}$/.test(raw) ? Number(raw) : null);

/** GET: one of my sessions, with its full draft. Someone else's id is a 404, never a 403. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'signed_out' }, { status: 401 });
  const id = parseId((await ctx.params).id);
  if (id === null) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  try {
    return NextResponse.json({ interview: await getInterview(session, id) });
  } catch (err) {
    return fail(err, 'get');
  }
}

/**
 * POST { action: 'save', draft }              autosave while it runs
 * POST { action: 'finish', draft?, scores? }  close it out, or update scores and re-check the AC
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const refused = guardPost(req);
  if (refused) return refused;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'signed_out' }, { status: 401 });
  const id = parseId((await ctx.params).id);
  if (id === null) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Read the body as text first so an oversized draft is refused before parsing.
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: 'too_big' }, { status: 413 });
  let body: Record<string, unknown> | null = null;
  try {
    const v = JSON.parse(raw);
    body = v && typeof v === 'object' && !Array.isArray(v) ? v : null;
  } catch {
    /* handled below */
  }
  if (!body) return NextResponse.json({ error: 'bad_request' }, { status: 400 });

  try {
    if (body.action === 'save') {
      await saveInterview(session, id, body.draft);
      return NextResponse.json({ ok: true });
    }
    if (body.action === 'finish') {
      const scores = body.scores === undefined ? null : cleanScores(body.scores);
      return NextResponse.json({ interview: await finishInterview(session, id, body.draft, scores) });
    }
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  } catch (err) {
    return fail(err, String(body.action));
  }
}
