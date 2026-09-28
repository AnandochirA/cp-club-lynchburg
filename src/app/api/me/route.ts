import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { memberView } from '@/lib/member-view';
import { guardPost } from '@/lib/request';
import { destroySession, getSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Who am I, and where do I stand. Reads only our own database (no LeetCode call). */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'signed_out' }, { status: 401 });
  try {
    return NextResponse.json(await memberView(session));
  } catch (err) {
    console.error('me failed', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}

/**
 * Delete my data: the member, their session, their solve log and placements
 * (all cascade). The original signup row is a separate lead-list entry and is
 * left for an officer to remove on request.
 */
export async function DELETE(req: Request) {
  const refused = guardPost(req);
  if (refused) return refused;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'signed_out' }, { status: 401 });
  try {
    const sql = db();
    await sql`delete from members where id = ${session.member.id}`;
    await destroySession();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('delete me failed', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
