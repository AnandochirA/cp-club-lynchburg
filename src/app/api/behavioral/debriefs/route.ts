import { NextResponse } from 'next/server';
import { BehavioralError, listDebriefs, saveDebrief } from '@/lib/behavioral';
import { cleanDebrief } from '@/lib/bh/model';
import { guardPost, readJson } from '@/lib/request';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET: my interview debriefs. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'signed_out' }, { status: 401 });
  try {
    return NextResponse.json({ debriefs: await listDebriefs(session) });
  } catch (err) {
    console.error('debrief list failed', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}

/** POST a debrief; it also files to-dos on the stories it mentions. Returns those stories updated. */
export async function POST(req: Request) {
  const refused = guardPost(req);
  if (refused) return refused;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'signed_out' }, { status: 401 });
  const input = cleanDebrief(await readJson(req));
  if (!input) return NextResponse.json({ error: 'empty' }, { status: 400 });
  try {
    return NextResponse.json(await saveDebrief(session, input));
  } catch (err) {
    if (err instanceof BehavioralError) return NextResponse.json({ error: err.code }, { status: 409 });
    console.error('debrief save failed', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
