import { NextResponse } from 'next/server';
import { BehavioralError, deleteDebrief } from '@/lib/behavioral';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** DELETE: remove one of my debriefs. To-dos it filed on stories stay until you tick them off. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'signed_out' }, { status: 401 });
  const raw = (await ctx.params).id;
  if (!/^\d{1,15}$/.test(raw)) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  try {
    await deleteDebrief(session, Number(raw));
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof BehavioralError) return NextResponse.json({ error: err.code }, { status: 404 });
    console.error('debrief delete failed', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
