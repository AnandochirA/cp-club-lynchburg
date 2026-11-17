import { NextResponse } from 'next/server';
import { behavioralState } from '@/lib/behavioral';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET: everything the behavioral page shows (stories, profile, recent rounds, prep stats, debriefs). */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'signed_out' }, { status: 401 });
  try {
    return NextResponse.json(await behavioralState(session));
  } catch (err) {
    console.error('behavioral state failed', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
