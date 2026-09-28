import Image from 'next/image';
import { club, footer } from '@/lib/content';
import logo from '@/assets/logo.png';

export function Footer() {
  // The static preview has no server, so there is no /me or /signin page to link to.
  const links =
    process.env.NEXT_PUBLIC_STATIC_PREVIEW === '1'
      ? footer.links.filter((l) => l.href !== '/me' && l.href !== '/signin')
      : footer.links;
  return (
    <footer className="relative flex flex-col gap-4 overflow-hidden border-t border-[#1A1B22] bg-ink-deep px-5 pt-11 text-muted lg:px-30 lg:pt-16">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <Image src={logo} alt="" className="h-9 w-auto shrink-0" />
          <span className="font-display text-base font-bold text-text">{club.full}</span>
        </div>
        <p className="m-0 text-[15px] leading-[1.5]">{footer.line}</p>
        <nav aria-label="Footer">
          <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-0 p-0">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="flex min-h-11 items-center text-[15px] text-soft no-underline hover:text-text"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div
          aria-hidden="true"
          className="wordmark rv-split font-display caps mt-auto -mb-[0.07em] pt-10 text-[clamp(3.4rem,14.4vw,13.2rem)] leading-[0.8] font-black tracking-[-0.01em] whitespace-nowrap"
        >
          {footer.wordmark.map((w, i) => (
            <span key={w} className="block">
              <span className="split-w" style={{ ['--w' as string]: i }}>
                <span>{w}</span>
              </span>
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
