import { NextResponse } from 'next/server';
import { InterviewerError, voice } from '@/lib/interviewer';
import { OpenAIError } from '@/lib/openai';
import { guardPost, readJson, str } from '@/lib/request';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATUS = { ai_off: 403, ai_limit: 429, not_found: 404, finished: 409 } as const;

/**
 * POST { text }: one coach line spoken in the round's persona voice (mp3).
 * Only for AI rounds. On any failure the browser falls back to its own voice.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const refused = guardPost(req);
  if (refused) return refused;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'signed_out' }, { status: 401 });
  const raw = (await ctx.params).id;
  if (!/^\d{1,15}$/.test(raw)) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const text = str((await readJson(req))?.text, 500);
  if (!text) return NextResponse.json({ error: 'empty' }, { status: 400 });
  try {
    const audio = await voice(session, Number(raw), text);
    return new Response(audio.body, { headers: { 'content-type': 'audio/mpeg', 'cache-control': 'no-store' } });
  } catch (err) {
    if (err instanceof InterviewerError) return NextResponse.json({ error: err.code }, { status: STATUS[err.code] });
    if (!(err instanceof OpenAIError)) console.error('voice failed', err);
    return NextResponse.json({ error: 'ai_unavailable' }, { status: 503 });
  }
}
