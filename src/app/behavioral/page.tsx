import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { BehavioralStudio } from '@/components/behavioral/BehavioralStudio';
import { listRounds, listStories } from '@/lib/behavioral';
import { behavioralCopy as B } from '@/lib/behavioral-kit';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: B.title, robots: { index: false, follow: false } };

/** Behavioral practice and the story bank. */
export default async function BehavioralPage() {
  const session = await getSession();
  if (!session) redirect('/signin');
  const [stories, rounds] = await Promise.all([listStories(session), listRounds(session)]);
  return <BehavioralStudio initialStories={stories} initialRounds={rounds} />;
}
