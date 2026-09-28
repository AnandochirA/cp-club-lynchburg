'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/content';
import { LinkLeetCode } from './LinkLeetCode';

/**
 * Sign in: prove you control the LeetCode account behind your membership.
 * Unlike sign-up it never creates an account: if there isn't one, it says so
 * and points to sign-up.
 */
export function SignInCard() {
  const router = useRouter();
  return (
    <div className="card-d flex flex-col gap-5 rounded-[24px] p-6 lg:p-9">
      <div className="flex flex-col gap-2">
        <h1 className="font-display m-0 text-[34px] leading-[1.05] font-extrabold tracking-[-0.015em] lg:text-[42px]">
          {auth.signIn.title}
        </h1>
        <p className="m-0 text-[16px] leading-[1.5] text-muted">{auth.signIn.sub}</p>
      </div>
      <LinkLeetCode intent="signin" onLinked={() => router.replace('/me')} />
      <p className="m-0 border-t border-white/8 pt-4 text-[15px] text-muted">
        {auth.signIn.newHere}{' '}
        <Link href="/#join" className="font-semibold text-crimson-hi no-underline hover:text-crimson-hi hover:underline">
          {auth.signIn.createAccount}
        </Link>
      </p>
    </div>
  );
}
