import Image from 'next/image';
import Link from 'next/link';
import logo from '@/assets/logo.png';
import { club } from '@/lib/content';

/** The frame around full-page account screens: the club mark, then a centred card. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center overflow-clip bg-ink px-5 py-8 text-text lg:py-14">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[460px]"
        style={{
          background:
            'radial-gradient(640px 320px at 50% 0%, rgba(228,0,43,0.18), rgba(228,0,43,0) 70%)',
        }}
      />
      <div aria-hidden="true" className="hex-bg-ink pointer-events-none absolute inset-0 opacity-80 [mask-image:radial-gradient(70%_60%_at_50%_10%,#000,transparent)]" />
      <div className="relative flex w-full max-w-[480px] flex-col gap-6 lg:gap-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 self-start text-text no-underline hover:text-text"
        >
          <Image src={logo} alt="" priority className="h-11 w-auto shrink-0" />
          <span className="flex flex-col gap-0.5">
            <span className="font-display text-base leading-[1.1] font-bold tracking-[-0.01em]">
              {club.name}
            </span>
            <span className="font-mono text-xs leading-[1.2] text-muted">{club.tagline}</span>
          </span>
        </Link>
        {children}
      </div>
    </main>
  );
}
