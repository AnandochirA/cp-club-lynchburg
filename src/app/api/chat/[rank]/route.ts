import { NextResponse } from 'next/server';
import { ChatError, canUseRoom, listRoom, postToRoom } from '@/lib/chat';
import { isRankKey } from '@/lib/progress';
import { guardPost, readJson, str } from '@/lib/request';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toInt(v: string | null): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && Number.isInteger(n) && n > 0 ? n : undefined;
}

/** GET a room's messages, cursor-paged: ?after=<id> to poll, ?before=<id> to
 * load older history, neither for the first load. Session-authed: a room is
 * members-only content, gated to whoever has reached that rank. */
export async function GET(req: Request, ctx: { params: Promise<{ rank: string }> }) {
  const { rank } = await ctx.params;
  if (!isRankKey(rank)) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'signed_out' }, { status: 401 });

  const unlocked = canUseRoom(session.member.rank, rank);
  if (!unlocked) return NextResponse.json({ ok: true, unlocked: false, messages: [], hasMore: false });

  const url = new URL(req.url);
  try {
    const { messages, hasMore } = await listRoom(rank, session.member.id, {
      after: toInt(url.searchParams.get('after')),
      before: toInt(url.searchParams.get('before')),
      limit: toInt(url.searchParams.get('limit')),
    });
    return NextResponse.json({ ok: true, unlocked: true, messages, hasMore });
  } catch (err) {
    console.error('chat list failed', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}

/** POST a message. POST-only: this changes data and a cookie-bearing GET can
 * be triggered cross-site. */
export async function POST(req: Request, ctx: { params: Promise<{ rank: string }> }) {
  const refused = guardPost(req);
  if (refused) return refused;
  const { rank } = await ctx.params;
  if (!isRankKey(rank)) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'signed_out' }, { status: 401 });

  const json = await readJson(req);
  if (!json) return NextResponse.json({ error: 'empty' }, { status: 400 });

  try {
    const message = await postToRoom(session, rank, str(json.body, 4000));
    return NextResponse.json({ ok: true, message });
  } catch (err) {
    if (err instanceof ChatError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    console.error('chat post failed', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
