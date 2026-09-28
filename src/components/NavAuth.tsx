'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { auth } from '@/lib/content';
import { IS_PREVIEW } from '@/lib/client-api';

const PRIMARY =
  'btn btn-primary flex h-11 shrink-0 items-center justify-center rounded-xl px-4 text-[15px] font-semibold text-white no-underline hover:text-white lg:px-5';

/**
 * The header's account buttons. Signed out: "Sign in" and "Sign up". Signed in:
 * "My progress". "Signed in" is read from a non-sensitive hint cookie (no
 * network request); it only changes which label shows, never what anyone can see.
 * The server renders the signed-out version, then this swaps after hydration.
 */
export function NavAuth() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    setSignedIn(document.cookie.split('; ').includes('cp_in=1'));
  }, []);

  if (signedIn && !IS_PREVIEW) {
    return (
      <Link href="/me" className={PRIMARY}>
        <span className="sheen" aria-hidden="true" />
        {auth.nav.account}
      </Link>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-1 lg:gap-2">
      {!IS_PREVIEW && (
        <Link
          href="/signin"
          className="navlink flex h-11 items-center rounded-xl px-3 text-[15px] font-medium text-[#C9C9CD] no-underline hover:text-text lg:px-4"
        >
          {auth.nav.signIn}
        </Link>
      )}
      <a href="#join" className={PRIMARY}>
        <span className="sheen" aria-hidden="true" />
        {auth.nav.signUp}
      </a>
    </div>
  );
}
