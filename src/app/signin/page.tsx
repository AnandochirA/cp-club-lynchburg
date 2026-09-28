import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/AuthShell';
import { SignInCard } from '@/components/SignInCard';
import { auth } from '@/lib/content';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: auth.signIn.title, robots: { index: false, follow: false } };

export default async function SignInPage() {
  let signedIn = false;
  try {
    signedIn = (await getSession()) !== null;
  } catch {
    /* if the database is unreachable, still show the form */
  }
  if (signedIn) redirect('/me');

  return (
    <AuthShell>
      <SignInCard />
    </AuthShell>
  );
}
