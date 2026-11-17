import { NextResponse } from 'next/server';
import { saveProfile } from '@/lib/behavioral';
import { cleanProfile } from '@/lib/bh/model';
import { guardPost, readJson } from '@/lib/request';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST the whole prep profile (level, company, values, Big Three picks, TMAY, questions to ask). */
export async function POST(req: Request) {
  const refused = guardPost(req);
  if (refused) return refused;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'signed_out' }, { status: 401 });
  const body = await readJson(req);
  if (!body) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  try {
    return NextResponse.json({ profile: await saveProfile(session, cleanProfile(body)) });
  } catch (err) {
    console.error('behavioral profile save failed', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
