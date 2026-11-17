import { NextResponse } from 'next/server';
import { BehavioralError, listStories, saveStory } from '@/lib/behavioral';
import { cleanStory } from '@/lib/bh/story';
import { guardPost, readJson } from '@/lib/request';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATUS = { story_limit: 409, round_limit: 429, drill_limit: 429, debrief_limit: 409, bad_question: 400, not_found: 404 } as const;

/** GET: my story bank. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'signed_out' }, { status: 401 });
  try {
    return NextResponse.json({ stories: await listStories(session) });
  } catch (err) {
    console.error('stories list failed', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}

/** POST { id?, ...story }: create a CARL story, or update one of mine. */
export async function POST(req: Request) {
  const refused = guardPost(req);
  if (refused) return refused;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'signed_out' }, { status: 401 });
  const body = await readJson(req);
  const story = cleanStory(body);
  if (!story) return NextResponse.json({ error: 'empty' }, { status: 400 });
  const id = Number.isInteger(body?.id) && (body!.id as number) > 0 ? (body!.id as number) : null;
  try {
    return NextResponse.json({ story: await saveStory(session, id, story) });
  } catch (err) {
    if (err instanceof BehavioralError) return NextResponse.json({ error: err.code }, { status: STATUS[err.code] });
    console.error('story save failed', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
