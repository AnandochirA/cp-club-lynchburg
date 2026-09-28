import { NextResponse } from 'next/server';
import { guardPost } from '@/lib/request';
import { destroySession } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const refused = guardPost(req);
  if (refused) return refused;
  await destroySession();
  return NextResponse.json({ ok: true });
}
