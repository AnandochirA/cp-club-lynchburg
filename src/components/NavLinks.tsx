'use client';

import { useEffect, useState } from 'react';
import { nav } from '@/lib/content';

/**
 * The header's section links. The one for the section you are reading gets a
 * crimson underline, and a hairline along the bottom of the header fills as the
 * page scrolls (a CSS variable, so no re-render per scroll event).
 */
export function NavLinks() {
  const [active, setActive] = useState<string>('');

  useEffect(() => {
    const ids = nav.map((n) => n.href).filter((h) => h.startsWith('#')).map((h) => h.slice(1));
    // Watch the sections after the last nav link too, so the underline clears once you pass them.
    const sections = [...ids, 'loop', 'join']
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(ids.includes(e.target.id) ? e.target.id : '');
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    sections.forEach((s) => io.observe(s));

    // Write the progress onto the one element that draws it, not the root: a custom
    // property changed on <html> would invalidate styles across the whole page each frame.
    const bar = document.querySelector<HTMLElement>('.nav-progress');
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
        bar?.style.setProperty('--sp', p.toFixed(4));
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <nav aria-label="Primary" className="hidden lg:block">
      <ul className="m-0 flex list-none items-center gap-0.5 p-0">
        {nav.map((item) => {
          const on = item.href === `#${active}`;
          return (
            <li key={item.href}>
              <a
                href={item.href}
                aria-current={on ? 'location' : undefined}
                className={`navlink relative flex h-11 items-center rounded-xl px-3.5 text-[15px] font-medium whitespace-nowrap no-underline transition-colors hover:text-white ${
                  on ? 'text-white' : 'text-[#C9C9CD]'
                }`}
              >
                {item.label}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-3.5 bottom-1.5 h-[2px] origin-left bg-crimson transition-transform duration-500 ease-[var(--ease-out-expo)] ${
                    on ? 'scale-x-100' : 'scale-x-0'
                  }`}
                />
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
