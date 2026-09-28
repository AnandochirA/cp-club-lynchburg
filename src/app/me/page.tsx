import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { MemberDashboard } from '@/components/MemberDashboard';
import { memberPage as M } from '@/lib/content';
import { memberView, type MemberView } from '@/lib/member-view';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: M.title, robots: { index: false, follow: false } };

/** Your rank and progress. Only reachable after proving you own your LeetCode account. */
export default async function MePage() {
  let view: MemberView | null = null;
  let broken = false;
  try {
    const session = await getSession();
    if (session) view = await memberView(session);
  } catch (err) {
    console.error('me page failed', err);
    broken = true;
  }
  // Not signed in: send them to the sign-in page rather than showing a form here.
  if (!broken && !view) redirect('/signin');

  if (broken || !view) {
    return (
      <main className="flex min-h-dvh flex-col items-start gap-4 bg-ink px-5 py-10 text-text lg:px-14">
        <Link href="/" className="font-mono text-sm text-muted no-underline hover:text-text">
          ← Competitive Programming Club
        </Link>
        <h1 className="font-display caps m-0 text-[64px] leading-[0.82] font-black lg:text-[96px]">{M.title}</h1>
        <p className="text-muted">Something went wrong on our side. Please try again in a moment.</p>
      </main>
    );
  }

  return (
    <main>
      <MemberDashboard initial={view} />
    </main>
  );
}
