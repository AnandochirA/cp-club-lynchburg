import { NextResponse } from 'next/server';
import { findProblem } from '@/lib/interview-logic';
import { LeetCodeError } from '@/lib/leetcode';
import { getSession } from '@/lib/session';
import { statementFor } from '@/lib/statement';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET: a ladder problem's statement, so the interview steps can be done here
 * before coding on LeetCode. Signed-in members only, ladder problems only;
 * fetched once and shared, so this never hammers LeetCode.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'signed_out' }, { status: 401 });
  const { slug } = await ctx.params;
  if (!findProblem(slug)) return NextResponse.json({ error: 'bad_problem' }, { status: 404 });
  try {
    const statement = await statementFor(slug);
    if (!statement) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ statement });
  } catch (err) {
    if (err instanceof LeetCodeError) return NextResponse.json({ error: 'leetcode_unavailable' }, { status: 503 });
    console.error('statement failed', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
