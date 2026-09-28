'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * The site's motion runtime. Mounted once in the layout, it does two jobs:
 *
 * 1. REVEALS. Anything with class `reveal` (or `rv-split` for headlines) gets
 *    `is-in` the first time it scrolls into view. CSS does the animating. The
 *    `js` class on <html> (set by an inline script before paint) is what lets CSS
 *    hide things: no JavaScript means nothing is ever hidden.
 *    A parent with `data-stagger` numbers its children so they cascade.
 *
 * 2. POINTER EFFECTS, on devices with a real mouse only, by event delegation so
 *    server-rendered markup can opt in with a data attribute:
 *      [data-spot]      a soft light follows the cursor across the surface
 *      [data-tilt]      the surface leans towards the cursor
 *      [data-magnetic]  the element drifts a few pixels towards the cursor
 *    All of it is skipped under `prefers-reduced-motion`.
 */
export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>('.reveal, .rv-split, .reveal-x'));
    document.querySelectorAll<HTMLElement>('[data-stagger]').forEach((parent) => {
      Array.from(parent.children).forEach((child, i) => (child as HTMLElement).style.setProperty('--i', String(i)));
    });
    if (typeof IntersectionObserver === 'undefined') {
      targets.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || calm) return;

    let raf = 0;
    let last: PointerEvent | null = null;
    let leaning: HTMLElement | null = null;

    const apply = () => {
      raf = 0;
      const e = last;
      if (!e) return;
      const under = (e.target as Element | null)?.closest?.('[data-spot],[data-tilt]') as HTMLElement | null;

      if (leaning && leaning !== under) {
        leaning.style.removeProperty('--rx');
        leaning.style.removeProperty('--ry');
        leaning = null;
      }
      if (under) {
        const r = under.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        under.style.setProperty('--mx', `${x}px`);
        under.style.setProperty('--my', `${y}px`);
        if (under.hasAttribute('data-tilt')) {
          const max = Number(under.getAttribute('data-tilt')) || 5;
          under.style.setProperty('--ry', `${((x / r.width - 0.5) * 2 * max).toFixed(2)}deg`);
          under.style.setProperty('--rx', `${((y / r.height - 0.5) * -2 * max).toFixed(2)}deg`);
          leaning = under;
        }
      }

      document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        const reach = Math.max(r.width, r.height) * 0.9;
        if (Math.hypot(dx, dy) < reach) {
          el.style.setProperty('--tx', `${(dx * 0.22).toFixed(1)}px`);
          el.style.setProperty('--ty', `${(dy * 0.28).toFixed(1)}px`);
        } else {
          el.style.removeProperty('--tx');
          el.style.removeProperty('--ty');
        }
      });
    };

    const onMove = (e: PointerEvent) => {
      last = e;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      document.querySelectorAll<HTMLElement>('[data-magnetic],[data-tilt]').forEach((el) => {
        ['--tx', '--ty', '--rx', '--ry'].forEach((v) => el.style.removeProperty(v));
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
