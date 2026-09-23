import { club, nav } from '@/lib/content';

export function Nav() {
  return (
    <header className="anim-drop sticky top-2.5 z-40 mx-2.5 mt-2.5 flex h-15 items-center justify-between gap-3 rounded-[18px] border border-white/9 bg-[rgba(19,20,26,0.72)] px-2 pl-3 backdrop-blur-[18px] backdrop-saturate-150 shadow-[0_16px_40px_-20px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.06)] lg:top-3.5 lg:mx-26 lg:mt-4 lg:h-16 lg:gap-6 lg:rounded-[20px] lg:px-2.5 lg:pl-4">
      <a href="#top" className="flex min-h-11 items-center gap-2.5 text-text no-underline hover:text-text">
        <span
          aria-hidden="true"
          className="gloss font-mono flex size-8.5 shrink-0 items-center justify-center rounded-[10px] text-[13px] font-bold tracking-[-0.03em] lg:size-9 lg:rounded-[11px] lg:text-sm"
        >
          cp_
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="font-display text-[15px] leading-[1.1] font-bold tracking-[-0.01em] lg:text-base">
            {club.name}
          </span>
          <span className="font-mono text-xs leading-[1.2] text-muted">{club.tagline}</span>
        </span>
      </a>

      <nav aria-label="Primary" className="hidden lg:block">
        <ul className="m-0 flex list-none items-center gap-0.5 p-0">
          {nav.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="navlink flex h-11 items-center rounded-xl px-3.5 text-[15px] font-medium text-[#C9C9CD] no-underline hover:text-[#C9C9CD]"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <a
        href="#join"
        className="btn btn-primary flex h-11 shrink-0 items-center justify-center rounded-xl px-4.5 text-[15px] font-semibold text-white no-underline hover:text-white lg:px-5"
      >
        <span className="sheen" aria-hidden="true" />
        <span className="lg:hidden">Join</span>
        <span className="hidden lg:inline">Join the Club</span>
      </a>
    </header>
  );
}
