import { NextResponse } from 'next/server';
import { BehavioralError, listRounds, saveRound } from '@/lib/behavioral';
import { MAX_ANSWER_CHARS, cleanRound } from '@/lib/behavioral-logic';
import { guardPost } from '@/lib/request';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET: my recent behavioral rounds. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'signed_out' }, { status: 401 });
  try {
    return NextResponse.json({ rounds: await listRounds(session) });
  } catch (err) {
    console.error('behavioral list failed', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}

/** POST { questionId, storyId?, answer[], probe[], durationMs, mic, star }: save a finished answer. */
export async function POST(req: Request) {
  const refused = guardPost(req);
  if (refused) return refused;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'signed_out' }, { status: 401 });
  // Read as text first so an oversized body is refused before parsing.
  const raw = await req.text();
  if (raw.length > MAX_ANSWER_CHARS * 2 + 4000) return NextResponse.json({ error: 'too_big' }, { status: 413 });
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    /* handled below */
  }
  const input = cleanRound(parsed);
  if (!input) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  try {
    return NextResponse.json({ round: await saveRound(session, input) });
  } catch (err) {
    if (err instanceof BehavioralError) {
      return NextResponse.json({ error: err.code }, { status: err.code === 'round_limit' ? 429 : 400 });
    }
    console.error('behavioral save failed', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
