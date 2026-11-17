import { NextResponse } from 'next/server';
import { BehavioralError, saveDrill } from '@/lib/behavioral';
import { cleanDrill } from '@/lib/bh/model';
import { guardPost, readJson } from '@/lib/request';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST { kind: 'decode' | 'select', questionId, correct, ms, detail }: one quick drill answer. */
export async function POST(req: Request) {
  const refused = guardPost(req);
  if (refused) return refused;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'signed_out' }, { status: 401 });
  const drill = cleanDrill(await readJson(req));
  if (!drill) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  try {
    await saveDrill(session, drill);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof BehavioralError) return NextResponse.json({ error: err.code }, { status: err.code === 'drill_limit' ? 429 : 400 });
    console.error('behavioral drill save failed', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
