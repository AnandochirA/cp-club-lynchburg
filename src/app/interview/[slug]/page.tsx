import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { InterviewRoom } from '@/components/interview/InterviewRoom';
import { findResumable, lastNextTime } from '@/lib/interview';
import { interviewCopy as C } from '@/lib/interview-kit';
import { findProblem } from '@/lib/interview-logic';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = findProblem((await params).slug);
  return { title: p ? `${C.title}: ${p.title}` : C.title, robots: { index: false, follow: false } };
}

/** A mock interview on one ladder problem. Any problem on the ladder, at any rank: practice is not gated. */
export default async function InterviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const problem = findProblem((await params).slug);
  if (!problem) notFound();

  const session = await getSession();
  if (!session) redirect('/signin');

  const [resume, nextTime] = await Promise.all([findResumable(session, problem.slug), lastNextTime(session)]);
  return (
    <main>
      <InterviewRoom key={resume?.id ?? 'new'} problem={problem} resume={resume} lastNextTime={nextTime} />
    </main>
  );
}
