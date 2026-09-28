import { NextResponse } from 'next/server';
import { LeetCodeError } from '@/lib/leetcode';
import { memberView } from '@/lib/member-view';
import { guardPost } from '@/lib/request';
import { getSession } from '@/lib/session';
import { claimCall, syncMember } from '@/lib/sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** "Sync now": pull my latest LeetCode solves. POST-only, and throttled per member. */
export async function POST(req: Request) {
  const refused = guardPost(req);
  if (refused) return refused;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'signed_out' }, { status: 401 });

  try {
    if (!(await claimCall(session.member.id, 60))) {
      return NextResponse.json({ error: 'too_soon' }, { status: 429 });
    }
    const outcome = await syncMember(session.member);
    const fresh = (await getSession()) ?? session;
    return NextResponse.json({ ok: true, outcome, me: await memberView(fresh) });
  } catch (err) {
    if (err instanceof LeetCodeError) return NextResponse.json({ error: 'leetcode_unavailable' }, { status: 503 });
    console.error('sync failed', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
