import Image from 'next/image';
import { club } from '@/lib/content';
import logo from '@/assets/logo.png';
import { NavAuth } from './NavAuth';
import { NavLinks } from './NavLinks';

export function Nav() {
  return (
    <header className="anim-drop sticky top-2.5 z-40 mx-2.5 mt-2.5 flex h-15 items-center justify-between gap-3 rounded-[18px] border border-white/9 bg-[rgba(11,12,16,0.93)] px-2 pl-3 backdrop-blur-[18px] backdrop-saturate-150 shadow-[0_16px_40px_-20px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.06)] lg:top-3.5 lg:mx-26 lg:mt-4 lg:h-16 lg:gap-6 lg:rounded-[20px] lg:px-2.5 lg:pl-4">
      <a href="#top" className="flex min-h-11 items-center gap-2.5 text-text no-underline hover:text-text">
        <Image src={logo} alt="" priority className="h-10 w-auto shrink-0 lg:h-11" />
        <span className="flex flex-col gap-0.5">
          <span className="font-display text-[15px] leading-[1.1] font-bold tracking-[-0.01em] lg:text-base">
            {club.name}
          </span>
          <span className="font-mono text-xs leading-[1.2] text-muted">{club.tagline}</span>
        </span>
      </a>

      <NavLinks />

      <NavAuth />
      <span aria-hidden="true" className="nav-progress pointer-events-none absolute right-5 bottom-0 left-5 h-[2px] origin-left bg-crimson" />
    </header>
  );
}
