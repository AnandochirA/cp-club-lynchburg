'use client';

import { memo, useEffect, useRef, useState } from 'react';
import {
  ILLUSTRATIVE_FILL,
  TIERS,
  TIER_START,
  honeycomb,
  hexPoints,
  mulberry32,
  type Cell,
} from '@/lib/hexgrid';

/**
 * THE GRID OF 250. Every hexagon is one real problem; the base is Guardian and
 * the peak is Divine. On the server it renders exactly the same cells with a
 * fixed illustrative pattern (wide base, narrow peak), so there is no flash.
 * In the browser it then:
 *   - prints itself in from the base up,
 *   - lights cells one at a time like accepted submissions (base often, peak
 *     rarely) and reports each one in the judge console,
 *   - bulges under the cursor and names the problem it is over.
 * Under reduced motion it stays a still picture.
 */

const COLS = 16;
const HC = honeycomb(COLS);
const R = 0.9;

const INITIAL: boolean[] = (() => {
  const rnd = mulberry32(250);
  return HC.cells.map((c) => rnd() < ILLUSTRATIVE_FILL[c.tier]);
})();

const LANGS = ['Python', 'C++', 'Java', 'Python', 'JavaScript'];

/** The 250 polygons. Memoised so React never touches them after the first paint. */
const Cells = memo(function Cells() {
  return (
    <>
      {HC.cells.map((c) => (
        <polygon
          key={c.k}
          className={INITIAL[c.k] ? 'cell on' : 'cell'}
          data-k={c.k}
          data-t={c.tier}
          points={hexPoints(c.x, c.y, R)}
          style={{ ['--d' as string]: `${c.row * 42 + ((c.k * 37) % 110)}ms` }}
        />
      ))}
    </>
  );
});

type Feed = { n: number; cell: Cell; ms: number; lang: string };
type Tip = { cell: Cell; left: number; top: number };

export function HexField({ className = '', console: showConsole = true }: { className?: string; console?: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [feed, setFeed] = useState<Feed>(() => ({ n: 0, cell: HC.cells[41], ms: 41, lang: 'Python' }));
  const [tip, setTip] = useState<Tip | null>(null);

  // ---- ambient: accepted submissions arriving, and the first-paint entrance
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const nodes = Array.from(svg.querySelectorAll<SVGPolygonElement>('.cell'));
    const lit = INITIAL.slice();
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    svg.classList.add('enter');
    const settle = window.setTimeout(() => svg.classList.remove('enter'), 3200);
    if (calm) return () => window.clearTimeout(settle);

    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.05 });
    io.observe(svg);

    // Low tiers are solved far more often than high ones: a true picture of a ladder.
    const weight = [5, 3.6, 2.4, 1.1, 0.35];
    const total = weight.reduce((a, b) => a + b, 0);
    let n = 0;
    let timer = 0;

    const tick = () => {
      if (visible && !document.hidden) {
        let r = Math.random() * total;
        let tier = 0;
        while (tier < 4 && r > weight[tier]) r -= weight[tier++];
        const lo = TIER_START[tier];
        const hi = tier === 4 ? HC.cells.length : TIER_START[tier + 1];
        // prefer a cell that is not lit yet; give up after a few tries
        let k = lo + Math.floor(Math.random() * (hi - lo));
        for (let tries = 0; tries < 8 && lit[k]; tries++) k = lo + Math.floor(Math.random() * (hi - lo));
        const node = nodes[k];
        if (node) {
          lit[k] = true;
          node.classList.add('on', 'fresh');
          window.setTimeout(() => node.classList.remove('fresh'), 1200);
          // keep the picture's density steady: quietly un-light an older cell in that tier
          const older = Array.from({ length: hi - lo }, (_, i) => lo + i).filter((i) => lit[i] && i !== k);
          if (older.length > (hi - lo) * ILLUSTRATIVE_FILL[tier] * 1.05) {
            const drop = older[Math.floor(Math.random() * older.length)];
            lit[drop] = false;
            nodes[drop].classList.remove('on');
          }
          n += 1;
          setFeed({
            n,
            cell: HC.cells[k],
            ms: 9 + Math.floor(Math.random() * 190),
            lang: LANGS[Math.floor(Math.random() * LANGS.length)],
          });
        }
      }
      timer = window.setTimeout(tick, 900 + Math.random() * 900);
    };
    timer = window.setTimeout(tick, 2800);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(settle);
      io.disconnect();
    };
  }, []);

  // ---- hover: cells near the cursor swell (a lens), and the nearest one is named
  const touched = useRef<SVGPolygonElement[]>([]);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const nodes = Array.from(svg.querySelectorAll<SVGPolygonElement>('.cell'));
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let ev: PointerEvent | null = null;

    const clear = () => {
      touched.current.forEach((n) => n.style.removeProperty('--h'));
      touched.current = [];
    };
    const run = () => {
      raf = 0;
      const e = ev;
      const ctm = svg.getScreenCTM();
      if (!e || !ctm) return;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const p = pt.matrixTransform(ctm.inverse());
      clear();
      let best: Cell | null = null;
      let bestD = Infinity;
      for (const c of HC.cells) {
        const d = Math.hypot(p.x - c.x, p.y - c.y);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
        if (!calm && d < 3.2) {
          const h = (1 - d / 3.2) ** 2;
          nodes[c.k].style.setProperty('--h', h.toFixed(3));
          touched.current.push(nodes[c.k]);
        }
      }
      setTip(best && bestD < 1.15 ? { cell: best, left: (best.x / HC.width) * 100, top: (best.y / HC.height) * 100 } : null);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      ev = e;
      if (!raf) raf = requestAnimationFrame(run);
    };
    const leave = () => {
      clear();
      setTip(null);
    };
    svg.addEventListener('pointermove', move);
    svg.addEventListener('pointerleave', leave);
    return () => {
      svg.removeEventListener('pointermove', move);
      svg.removeEventListener('pointerleave', leave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const open = () => {
    if (tip) window.open(`https://leetcode.com/problems/${tip.cell.slug}/`, '_blank', 'noopener,noreferrer');
  };

  const fc = feed.cell;
  return (
    <div className={`relative ${className}`}>
      <div className="relative" style={{ aspectRatio: `${HC.width} / ${HC.height}` }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${HC.width.toFixed(3)} ${HC.height.toFixed(3)}`}
          role="img"
          aria-label="A honeycomb of the club's 250 problems, one hexagon each, from Guardian at the base to Divine at the peak. Cells light up as problems are solved."
          className="hexfield block h-full w-full overflow-visible"
          style={{ cursor: tip ? 'pointer' : 'default' }}
          onClick={open}
        >
          <Cells />
        </svg>

        {tip && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[135%] whitespace-nowrap"
            style={{ left: `${tip.left}%`, top: `${tip.top}%` }}
          >
            <div className="flex flex-col gap-0.5 bg-[#0B0C10] px-3 py-2 text-white [clip-path:polygon(0_0,calc(100%-10px)_0,100%_10px,100%_100%,0_100%)]">
              <span className="font-display text-[19px] leading-none font-bold tracking-[0.01em] uppercase">
                {tip.cell.title}
              </span>
              <span className="font-mono flex items-center gap-2 text-[11.5px] text-white/70">
                <span className="size-2 rounded-[2px]" style={{ background: TIERS[tip.cell.tier].color }} />
                #{tip.cell.id} · {TIERS[tip.cell.tier].name} · {tip.cell.difficulty.toLowerCase()}
              </span>
            </div>
          </div>
        )}
      </div>

      {showConsole && (
        <div className="relative z-10 -mt-3 flex flex-col gap-3 lg:mt-3">
          <div
            key={feed.n}
            className="anim-rise flex items-stretch gap-4 bg-[#0B0C10] py-3 pr-5 pl-4 text-white [clip-path:polygon(0_0,calc(100%-14px)_0,100%_14px,100%_100%,0_100%)]"
            style={{ animationDuration: '.5s' }}
          >
            <div className="flex min-w-0 flex-grow flex-col justify-center gap-1.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="verdict on-ink verdict-stamp" data-v="ac">
                  <span className="tick">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m5 12.5 4.5 4.5L19 7.5" />
                    </svg>
                  </span>
                  Accepted
                </span>
                <span className="tests" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <i key={i} style={{ ['--n' as string]: i }} />
                  ))}
                </span>
              </div>
              <span className="font-display truncate text-[26px] leading-none font-bold tracking-[0.01em] uppercase lg:text-[30px]">
                {fc.title}
              </span>
              <span className="font-mono flex flex-wrap items-center gap-x-2.5 text-[12px] text-white/60">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-[2px]" style={{ background: TIERS[fc.tier].color }} />
                  {TIERS[fc.tier].name}
                </span>
                <span>#{fc.id}</span>
                <span>{fc.difficulty.toLowerCase()}</span>
                <span>{feed.lang}</span>
                <span>{feed.ms} ms</span>
              </span>
            </div>
          </div>

          <ul className="font-mono m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-[11.5px] tracking-[0.02em] text-ink-muted">
            {TIERS.map((t, i) => (
              <li key={t.key} className="flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2.5 rounded-[2px]" style={{ background: t.onPaper }} />
                {t.name}
                <span className="text-ink-text/50">{(i === 4 ? HC.cells.length : TIER_START[i + 1]) - TIER_START[i]}</span>
              </li>
            ))}
          </ul>
          <p className="font-mono m-0 text-[11px] text-ink-muted/80">Illustration. Hover a hexagon to see the problem.</p>
        </div>
      )}
    </div>
  );
}
