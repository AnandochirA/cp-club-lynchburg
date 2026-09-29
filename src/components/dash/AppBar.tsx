'use client';

import Image from 'next/image';
import Link from 'next/link';
import logo from '@/assets/logo.png';
import { club, memberPage as M, roomsPage as R } from '@/lib/content';
import type { MemberView } from '@/lib/member-view';
import { ago } from '@/lib/momentum';
import { useNow } from './hooks';

/** Sticky top bar: back to the site, sync status, Sync now, Sign out. */
export function AppBar({
  me,
  busy,
  onSync,
  onSignOut,
}: {
  me: MemberView;
  busy: 'sync' | 'out' | 'delete' | null;
  onSync: () => void;
  onSignOut: () => void;
}) {
  const now = useNow(30_000);
  const last = me.lastSyncedAt ? new Date(me.lastSyncedAt).getTime() : null;
  const state = busy === 'sync' ? 'busy' : last === null ? 'never' : 'ok';
  const when = last === null ? M.never : now === null ? '…' : ago(last, now);

  return (
    <header className="dash-bar">
      <Link href="/" className="flex min-w-0 items-center gap-3 text-text no-underline hover:text-text" aria-label={`${club.name}: back to the site`}>
        <Image src={logo} alt="" priority className="h-9 w-auto shrink-0" />
        <span className="hidden min-w-0 flex-col sm:flex">
          <span className="font-display truncate text-[17px] leading-[1.05] font-bold">{club.name}</span>
          <span className="font-mono truncate text-[11.5px] leading-[1.2] text-muted">{club.tagline}</span>
        </span>
      </Link>

      <div className="flex items-center gap-2 sm:gap-3">
        <span className="font-mono hidden items-center gap-2.5 pr-1 text-[12.5px] text-white/60 md:flex" role="status">
          <i className="live" data-state={state} aria-hidden="true" />
          {M.lastSynced}: {when}
        </span>
        <Link href="/rooms" className="bar-btn no-underline">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 4h16v12H8l-4 4z" />
          </svg>
          {R.back}
        </Link>
        <button type="button" onClick={onSync} disabled={busy !== null} data-busy={busy === 'sync' ? '1' : undefined} className="bar-btn primary">
          <svg className="sync-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" />
            <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" />
            <path d="M21 3v5h-5M3 21v-5h5" />
          </svg>
          {busy === 'sync' ? M.syncing : M.sync}
          <kbd className="kbd hidden lg:inline" aria-hidden="true">
            S
          </kbd>
        </button>
        <button type="button" onClick={onSignOut} disabled={busy !== null} className="bar-btn">
          {M.signOut}
        </button>
      </div>
    </header>
  );
}
