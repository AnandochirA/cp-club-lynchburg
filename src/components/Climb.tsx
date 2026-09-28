'use client';

import { useEffect, useRef, useState } from 'react';
import { ranks } from '@/lib/content';
import { TIERS, TIER_START, TOTAL, honeycomb, hexPoints } from '@/lib/hexgrid';
import { RankBadge } from './RankBadge';
import { Chip } from './ui';

/**
 * THE CLIMB. A pinned, scroll-driven scene: as you scroll, the honeycomb fills
 * from Guardian at the base to Divine at the peak, the counter rolls from 0 to
 * 250, and the medal, name and topics change as you cross each tier. Scroll
 * position IS the ascent.
 *
 * Only two things touch the DOM per frame (cell classes and the counter text);
 * React re-renders only when the tier changes. Sighted users get the scene; the
 * same information is always in the DOM as a plain list for screen readers, and
 * as the visible fallback under reduced motion or without JavaScript.
 */

const COLS = 10;
const HC = honeycomb(COLS);
const R = 0.9;
const BOUNDS = [...TIER_START, TOTAL];

const tierOf = (lit: number) => {
  const last = Math.max(0, lit - 1);
  for (let t = 4; t >= 0; t--) if (last >= BOUNDS[t]) return t;
  return 0;
};

export function Climb() {
  const runway = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const [tier, setTier] = useState(0);

  useEffect(() => {
    const host = runway.current;
    const el = svg.current;
    const counter = count.current;
    if (!host || !el || !counter) return;
    const cells = Array.from(el.querySelectorAll<SVGPolygonElement>('.cell'));
    const labels = Array.from(host.querySelectorAll<HTMLElement>('[data-tier-label]'));
    let target = 0; // where the scroll says we should be (0..250)
    let shown = 0; // where we are drawing (eased towards target)
    let lit = 0;
    let running = false;
    let raf = 0;
    let lastTier = 0;

    const measure = () => {
      const r = host.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
      // hold the finished picture for the last few percent of the runway
      target = Math.min(1, p / 0.94) * TOTAL;
    };

    const paint = () => {
      const next = Math.round(shown);
      if (next !== lit) {
        const up = next > lit;
        const from = Math.min(lit, next);
        const to = Math.max(lit, next);
        for (let k = from; k < to; k++) {
          const c = cells[k];
          if (!c) continue;
          if (up) {
            c.classList.add('on');
            if (to - k <= 7) {
              c.classList.add('fresh');
              window.setTimeout(() => c.classList.remove('fresh'), 900);
            }
          } else {
            c.classList.remove('on', 'fresh');
          }
        }
        lit = next;
        counter.textContent = String(lit);
        const t = tierOf(lit);
        if (t !== lastTier) {
          lastTier = t;
          setTier(t);
        }
        labels.forEach((l, i) => l.toggleAttribute('data-reached', lit > BOUNDS[i]));
      }
    };

    const frame = () => {
      shown += (target - shown) * 0.16;
      if (Math.abs(target - shown) < 0.04) shown = target;
      paint();
      if (shown !== target) raf = requestAnimationFrame(frame);
      else running = false;
    };
    const kick = () => {
      measure();
      if (!running) {
        running = true;
        raf = requestAnimationFrame(frame);
      }
    };

    kick();
    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', kick);
    return () => {
      window.removeEventListener('scroll', kick);
      window.removeEventListener('resize', kick);
      cancelAnimationFrame(raf);
    };
  }, []);

  const rank = ranks[tier];
  const first = TIER_START[tier] + 1;
  const last = BOUNDS[tier + 1];

  return (
    <div>
      {/* the scene */}
      <div ref={runway} aria-hidden="true" className="climb-scroll relative h-[380vh] lg:h-[430vh]">
        <div className="sticky top-0 flex h-dvh items-center">
          <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-3 pt-20 pb-6 lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-10 lg:pt-24">
            {/* the honeycomb */}
            <div className="relative w-full max-w-[420px] [container-type:inline-size] lg:col-span-5 lg:max-w-none">
              <svg
                ref={svg}
                viewBox={`0 0 ${HC.width.toFixed(3)} ${HC.height.toFixed(3)}`}
                style={{ ['--asp' as string]: (HC.width / HC.height).toFixed(4) }}
                className="climb-svg hexfield on-ink mx-auto block w-auto overflow-visible lg:mx-0 lg:ml-36"
              >
                {HC.cells.map((c) => (
                  <polygon key={c.k} className="cell" data-t={c.tier} points={hexPoints(c.x, c.y, R)} />
                ))}
              </svg>
              {/* tier labels down the left edge, aligned to where each tier begins */}
              <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-32 lg:block">
                {TIERS.map((t, i) => (
                  <span
                    key={t.key}
                    data-tier-label
                    className="font-mono absolute left-0 flex -translate-y-1/2 items-center gap-2 text-[11px] tracking-[0.14em] text-white/30 uppercase transition-colors duration-500 data-[reached]:text-white"
                    style={{ top: `${(HC.cells[TIER_START[i]].y / HC.height) * 100}%` }}
                  >
                    <span className="h-px w-5 bg-current" />
                    {t.name}
                  </span>
                ))}
              </div>
            </div>

            {/* the counter and the current rank */}
            <div className="flex w-full flex-col gap-2 lg:col-span-7 lg:gap-6">
              <div className="font-display flex items-baseline justify-center gap-2 leading-[0.8] font-black text-white tabular-nums lg:justify-start">
                <span ref={count} className="text-[clamp(5rem,26vw,8.5rem)] lg:text-[clamp(9rem,15vw,15rem)]">
                  0
                </span>
                <span className="text-[clamp(1.4rem,7vw,2.4rem)] text-white/30 lg:text-[clamp(2.4rem,4vw,4rem)]">/ {TOTAL}</span>
              </div>

              <div key={tier} className="anim-rise flex items-center gap-4 lg:gap-7" style={{ animationDuration: '.6s' }}>
                <div className="shrink-0">
                  <RankBadge rank={rank} size={88} bg="#08090C" />
                </div>
                <div className="flex min-w-0 flex-col gap-1.5 lg:gap-3">
                  <span className="font-mono text-[11.5px] tracking-[0.16em] uppercase" style={{ color: TIERS[tier].color }}>
                    Level {rank.level} · problems {first}–{last}
                  </span>
                  <span className="font-display caps text-[clamp(2.6rem,10vw,3.6rem)] leading-[0.85] font-black text-white lg:text-[clamp(3.6rem,6vw,6.2rem)]">
                    {rank.name}
                  </span>
                  <div className="hidden flex-wrap gap-2 sm:flex">
                    {rank.topics.length > 0 ? (
                      rank.topics.map((t) => <Chip key={t}>{t}</Chip>)
                    ) : (
                      <span className="max-w-[420px] text-[15px] leading-[1.45] text-muted">{rank.note}</span>
                    )}
                  </div>
                </div>
              </div>
              <p className="font-mono m-0 hidden text-[12px] tracking-[0.04em] text-white/40 lg:block">
                Scroll to climb. {rank.tag ? `“${rank.tag}”` : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* the same ladder as a plain list: for screen readers always, for everyone under reduced motion */}
      <ol className="climb-static m-0 list-none p-0" aria-label="The five ranks">
        {ranks.map((r) => (
          <li key={r.key} className="flex items-start gap-4 border-t border-white/10 py-5">
            <RankBadge rank={r} size={56} bg="#08090C" />
            <div className="flex flex-col gap-1.5">
              <span className="font-display caps text-[32px] leading-none font-black text-white">{r.name}</span>
              <span className="font-mono text-[12.5px] text-dim">{r.countLabel}</span>
              <span className="text-[15px] leading-[1.45] text-muted">
                {r.topics.length > 0 ? r.topics.join(', ') : r.note}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
