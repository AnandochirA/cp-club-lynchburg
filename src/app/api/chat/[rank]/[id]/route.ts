import { NextResponse } from 'next/server';
import { deleteMessage } from '@/lib/chat';
import { isRankKey } from '@/lib/progress';
import { guardPost } from '@/lib/request';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Delete your own message (any time). It becomes a tombstone, not a gap:
 * see chat.ts. Officers use /api/admin/chat instead. */
export async function DELETE(req: Request, ctx: { params: Promise<{ rank: string; id: string }> }) {
  const refused = guardPost(req);
  if (refused) return refused;
  const { rank, id } = await ctx.params;
  if (!isRankKey(rank)) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const messageId = Number(id);
  if (!Number.isInteger(messageId) || messageId <= 0) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'signed_out' }, { status: 401 });

  try {
    const removed = await deleteMessage(messageId, { memberId: session.member.id });
    if (!removed) return NextResponse.json({ error: 'message_gone' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('chat delete failed', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
