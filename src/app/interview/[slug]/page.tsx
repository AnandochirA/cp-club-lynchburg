import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { InterviewRoom } from '@/components/interview/InterviewRoom';
import { findResumable, lastNextTime } from '@/lib/interview';
import { aiAllowed } from '@/lib/interviewer';
import { interviewCopy as C } from '@/lib/interview-kit';
import { findProblem } from '@/lib/interview-logic';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = findProblem((await params).slug);
  return { title: p ? `${C.title}: ${p.title}` : C.title, robots: { index: false, follow: false } };
}

/** A mock interview on one ladder problem. Any problem on the ladder, at any rank: practice is not gated. */
export default async function InterviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const problem = findProblem((await params).slug);
  const q = await searchParams;
  if (!problem) notFound();

  const session = await getSession();
  if (!session) redirect('/signin');

  const [resume, nextTime, ai] = await Promise.all([findResumable(session, problem.slug), lastNextTime(session), aiAllowed(session)]);
  return (
    <main>
      <InterviewRoom
        key={resume?.id ?? 'new'}
        problem={problem}
        resume={resume}
        lastNextTime={nextTime}
        // ?go=1: straight in from the blind draw. ?mode=redo: a retry from the redo queue.
        autostart={q.go === '1' && !!resume}
        startMode={q.mode === 'redo' ? 'redo' : 'practice'}
        aiAvailable={ai}
      />
    </main>
  );
}
