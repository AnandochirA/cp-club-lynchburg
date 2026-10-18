import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { BlindDraw } from '@/components/interview/BlindDraw';
import { interviewCopy as C } from '@/lib/interview-kit';
import { aiAllowed } from '@/lib/interviewer';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: C.blind.title, robots: { index: false, follow: false } };

/** Draw a blind problem. The server picks it when you press Draw, so there is nothing to peek at here. */
export default async function DrawPage() {
  const session = await getSession();
  if (!session) redirect('/signin');
  return <BlindDraw aiAvailable={await aiAllowed(session)} />;
}
