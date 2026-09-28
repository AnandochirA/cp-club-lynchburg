import Image from 'next/image';
import { club, footer } from '@/lib/content';
import logo from '@/assets/logo.png';

export function Footer() {
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
            {footer.links.map((l) => (
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
          className="font-display -mb-3.5 mt-auto bg-clip-text pt-6 text-[clamp(3.5rem,13vw,9rem)] leading-[0.9] font-extrabold tracking-[-0.02em] whitespace-nowrap text-transparent"
          style={{ backgroundImage: 'linear-gradient(180deg, #2A2B35 0%, rgba(42,43,53,0) 92%)' }}
        >
          {footer.wordmark.map((w) => (
            <span key={w} className="block">
              {w}
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
