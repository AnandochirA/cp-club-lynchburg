import { NextResponse } from 'next/server';
import { InterviewError, markReviewed } from '@/lib/interview';
import { guardPost, readJson, str } from '@/lib/request';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST { slug }: you reviewed your old solution to a solved problem that is due in the redo queue. */
export async function POST(req: Request) {
  const refused = guardPost(req);
  if (refused) return refused;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'signed_out' }, { status: 401 });
  const body = await readJson(req);
  try {
    await markReviewed(session, str(body?.slug, 120));
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof InterviewError) return NextResponse.json({ error: err.code }, { status: 400 });
    console.error('review failed', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
