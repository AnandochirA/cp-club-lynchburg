import { NextResponse } from 'next/server';
import { LeetCodeError } from '@/lib/leetcode';
import { PlacementError, finishPlacement, pollPlacement, startPlacement } from '@/lib/placement';
import { guardPost } from '@/lib/request';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/placement/start | poll | finish
 *
 * All POST-only (a cookie-bearing GET can be triggered cross-site, and poll
 * reaches LeetCode). The heavy lifting and every rule lives in src/lib/placement.ts.
 */
export async function POST(req: Request, ctx: { params: Promise<{ action: string }> }) {
  const refused = guardPost(req);
  if (refused) return refused;
  const { action } = await ctx.params;
  if (action !== 'start' && action !== 'poll' && action !== 'finish') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'signed_out' }, { status: 401 });

  try {
    const placement =
      action === 'start'
        ? await startPlacement(session)
        : action === 'poll'
          ? await pollPlacement(session)
          : await finishPlacement(session);
    if (!placement) return NextResponse.json({ error: 'none_started' }, { status: 404 });
    return NextResponse.json({ placement });
  } catch (err) {
    if (err instanceof PlacementError) {
      const status = err.code === 'reverify' ? 403 : err.code === 'cooldown' ? 429 : 503;
      return NextResponse.json({ error: err.code, retryAt: err.retryAt }, { status });
    }
    if (err instanceof LeetCodeError) return NextResponse.json({ error: 'leetcode_unavailable' }, { status: 503 });
    console.error('placement failed', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
