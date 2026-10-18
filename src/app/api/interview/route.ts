import { NextResponse } from 'next/server';
import { behavioralDoor } from '@/lib/behavioral';
import { InterviewError, arenaFor, choosePersona, pickBlind, startExtras, startInterview } from '@/lib/interview';
import { guardPost, readJson, str } from '@/lib/request';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET: the dashboard's Arena: readiness, the redo queue, weak spots, recent rounds. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'signed_out' }, { status: 401 });
  try {
    const [arena, behavioral] = await Promise.all([arenaFor(session), behavioralDoor(session)]);
    return NextResponse.json({ arena, behavioral });
  } catch (err) {
    console.error('arena failed', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}

/**
 * POST { slug, mode? }: start a mock interview on a ladder problem.
 * POST { mode: 'blind' }: the server draws the problem; any slug sent is ignored.
 * Both take { persona?: PersonaKey | 'mystery' }.
 */
export async function POST(req: Request) {
  const refused = guardPost(req);
  if (refused) return refused;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'signed_out' }, { status: 401 });
  const body = await readJson(req);
  try {
    const mode = body?.mode === 'blind' ? 'blind' : body?.mode === 'redo' ? 'redo' : 'practice';
    const slug = mode === 'blind' ? await pickBlind(session) : str(body?.slug, 120);
    const { persona, mystery } = choosePersona(body?.persona, mode);
    const extras = { ...startExtras(slug, mode), mystery };
    const interview = await startInterview(session, slug, { mode, extras, persona });
    return NextResponse.json({ interview });
  } catch (err) {
    if (err instanceof InterviewError) {
      const status = err.code === 'interview_limit' ? 429 : 400;
      return NextResponse.json({ error: err.code }, { status });
    }
    console.error('interview start failed', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
