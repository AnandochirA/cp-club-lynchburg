import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { BehavioralStudio } from '@/components/behavioral/BehavioralStudio';
import { behavioralState } from '@/lib/behavioral';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Behavioral', robots: { index: false, follow: false } };

/** Behavioral prep: the path, the story catalog, practice, the playbook and debriefs. */
export default async function BehavioralPage() {
  const session = await getSession();
  if (!session) redirect('/signin');
  return <BehavioralStudio initial={await behavioralState(session)} />;
}
