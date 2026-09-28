'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RANK_KEYS, curriculum } from '@/lib/curriculum';
import { hexPoints, honeycomb, TIERS, type Cell } from '@/lib/hexgrid';
import type { MemberView } from '@/lib/member-view';
import { Icon } from '../icons';
import { useCalm, useFinePointer } from './hooks';
import { Odometer } from './Odometer';

const COLS = 16;
const HC = honeycomb(COLS);
const PTS = HC.cells.map((c) => hexPoints(c.x, c.y, 0.94));
const BY_SLUG = new Map(HC.cells.map((c) => [c.slug, c]));
const TIER_SIZE = RANK_KEYS.map((k) => curriculum[k].length);

/** One character per cell: o = solved, c = cleared by rank (not solved), x = still to do. */
function encode(solved: ReadonlySet<string>, rankIdx: number): string {
  let s = '';
  for (const c of HC.cells) s += solved.has(c.slug) ? 'o' : c.tier < rankIdx ? 'c' : 'x';
  return s;
}

type Nodes = Map<string, SVGPolygonElement>;

/**
 * The 250 hexagons. Memoised on primitives, so hovering, the replay and the
 * console never re-render 250 polygons: those write to the DOM nodes directly.
 */
const Cells = memo(function Cells({
  states,
  focusTier,
  register,
}: {
  states: string;
  focusTier: number;
  register: (slug: string, el: SVGPolygonElement | null) => void;
}) {
  return (
    <>
      {HC.cells.map((c) => (
        <polygon
          key={c.slug}
          ref={(el) => register(c.slug, el)}
          className="cell"
          points={PTS[c.k]}
          data-t={c.tier}
          data-s={states[c.k]}
          data-s0={states[c.k]}
          data-f={c.tier === focusTier ? '1' : undefined}
          style={{ ['--row' as string]: c.row, ['--col' as string]: c.k % COLS, ['--k' as string]: c.k }}
        />
      ))}
    </>
  );
});

type Replay = { n: number; i: number; cell: Cell | null; ts: number };

const dateOf = (ts: number) =>
  new Date(ts * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

/**
 * YOUR GRID: all 250 problems as a honeycomb, lit where you have solved them.
 * Hover (or tap) a hexagon to read it. "Replay my climb" re-runs your solves
 * in the order you did them, a comet hopping from cell to cell.
 */
export function MyGrid({
  me,
  solvedSet,
  upNext,
  fresh,
  scanning,
  highlight,
}: {
  me: MemberView;
  solvedSet: ReadonlySet<string>;
  /** The next few problems to solve, best first: numbered on the map. */
  upNext: string[];
  /** Slugs found solved by the latest sync. */
  fresh: ReadonlySet<string>;
  scanning: boolean;
  /** A problem to pulse (its ticket is being hovered). */
  highlight: string | null;
}) {
  const fine = useFinePointer();
  const calm = useCalm();
  const svgRef = useRef<SVGSVGElement>(null);
  const nodes = useRef<Nodes>(new Map());
  const touched = useRef<SVGPolygonElement[]>([]);
  const overRef = useRef<string | null>(null);
  const raf = useRef(0);
  const cometRef = useRef<SVGGElement>(null);
  const trailRef = useRef<SVGPolylineElement>(null);
  const stopReplay = useRef<(() => void) | null>(null);

  const [hover, setHover] = useState<Cell | null>(null);
  const [sel, setSel] = useState<Cell | null>(null);
  const [replay, setReplay] = useState<Replay | null>(null);

  const rankIdx = RANK_KEYS.indexOf(me.rank);
  const focusIdx = RANK_KEYS.indexOf(me.focus);
  const states = useMemo(() => encode(solvedSet, rankIdx), [solvedSet, rankIdx]);
  const solvedAt = useMemo(() => new Map(me.timeline), [me.timeline]);

  const register = useCallback((slug: string, el: SVGPolygonElement | null) => {
    if (el) nodes.current.set(slug, el);
    else nodes.current.delete(slug);
  }, []);

  const perTier = useMemo(() => {
    const out = TIER_SIZE.map(() => 0);
    for (const c of HC.cells) if (states[c.k] === 'o') out[c.tier]++;
    return out;
  }, [states]);

  /* ---- pointer: a lens that swells the cells around the cursor, and picking ---- */
  const locate = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * HC.width;
    const y = ((clientY - r.top) / r.height) * HC.height;
    let best: Cell | null = null;
    let bd = Infinity;
    for (const c of HC.cells) {
      const d = Math.hypot(x - c.x, y - c.y);
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    return { x, y, best, bd };
  };

  const clearLens = () => {
    for (const el of touched.current) el.style.removeProperty('--h');
    touched.current = [];
  };

  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || replay) return;
    const { clientX, clientY } = e;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const at = locate(clientX, clientY);
      if (!at) return;
      clearLens();
      if (!calm) {
        for (const c of HC.cells) {
          const d = Math.hypot(at.x - c.x, at.y - c.y);
          if (d < 3.2) {
            const el = nodes.current.get(c.slug);
            if (el) {
              el.style.setProperty('--h', ((1 - d / 3.2) ** 2).toFixed(3));
              touched.current.push(el);
            }
          }
        }
      }
      const cell = at.best && at.bd < 1.15 ? at.best : null;
      if ((cell?.slug ?? null) !== overRef.current) {
        overRef.current = cell?.slug ?? null;
        setHover(cell);
      }
    });
  };
  const onLeave = () => {
    cancelAnimationFrame(raf.current);
    clearLens();
    overRef.current = null;
    setHover(null);
  };
  const onPick = (e: React.MouseEvent) => {
    if (replay) return;
    const at = locate(e.clientX, e.clientY);
    if (!at?.best || at.bd > 1.2) return setSel(null);
    const cell = at.best;
    setSel((cur) => (cur?.slug === cell.slug ? null : cell));
  };

  /* ---- keep a few DOM-only marks in step with props ---- */
  useEffect(() => {
    const el = sel && nodes.current.get(sel.slug);
    el?.classList.add('sel');
    return () => el?.classList.remove('sel');
  }, [sel, states]);
  useEffect(() => {
    const el = highlight ? nodes.current.get(highlight) : null;
    el?.classList.add('hl');
    return () => el?.classList.remove('hl');
  }, [highlight, states]);

  // Cells the latest sync found spring out (the ripples are drawn separately).
  useEffect(() => {
    const els = [...fresh].map((slug) => nodes.current.get(slug)).filter((el): el is SVGPolygonElement => !!el);
    els.forEach((el) => el.classList.add('blip'));
    return () => els.forEach((el) => el.classList.remove('blip'));
  }, [fresh]);

  /* ---- replay my climb ---- */
  const finishReplay = useCallback(() => {
    nodes.current.forEach((el) => {
      el.dataset.s = el.dataset.s0;
      el.classList.remove('blip');
    });
    if (cometRef.current) cometRef.current.style.opacity = '0';
    if (trailRef.current) trailRef.current.setAttribute('points', '');
    svgRef.current?.classList.add('flash');
    setTimeout(() => svgRef.current?.classList.remove('flash'), 1100);
    stopReplay.current = null;
    setReplay(null);
  }, []);

  const startReplay = () => {
    if (stopReplay.current) return stopReplay.current();
    const order = me.timeline.filter(([slug]) => BY_SLUG.has(slug));
    if (order.length === 0) return;
    setSel(null);
    setHover(null);
    clearLens();
    nodes.current.forEach((el) => {
      el.dataset.s = el.dataset.s0 === 'c' ? 'c' : 'x';
    });
    const step = Math.max(26, Math.min(130, 4400 / order.length));
    const trail: string[] = [];
    let i = 0;
    let timer = 0;
    const stop = () => {
      clearTimeout(timer);
      finishReplay();
    };
    stopReplay.current = stop;
    setReplay({ n: order.length, i: 0, cell: null, ts: 0 });

    const tick = () => {
      const [slug, ts] = order[i];
      const cell = BY_SLUG.get(slug)!;
      const el = nodes.current.get(slug);
      if (el) {
        el.dataset.s = 'o';
        el.classList.remove('blip');
        void el.getBoundingClientRect(); // restart the animation if it ran before
        el.classList.add('blip');
      }
      const head = cometRef.current;
      if (head) {
        head.style.opacity = '1';
        head.style.transform = `translate(${cell.x.toFixed(2)}px, ${cell.y.toFixed(2)}px)`;
      }
      trail.push(`${cell.x.toFixed(2)},${cell.y.toFixed(2)}`);
      if (trail.length > 9) trail.shift();
      trailRef.current?.setAttribute('points', trail.join(' '));
      i++;
      setReplay({ n: order.length, i, cell, ts });
      if (i >= order.length) {
        timer = window.setTimeout(stop, 700);
      } else {
        timer = window.setTimeout(tick, step);
      }
    };
    timer = window.setTimeout(tick, 350);
  };

  // A replay must not outlive its data or the page.
  useEffect(() => () => stopReplay.current?.(), [states]);
  useEffect(() => {
    if (!replay) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && stopReplay.current?.();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [replay]);

  /* ---- what the console shows ---- */
  const nextCells = upNext.map((s) => BY_SLUG.get(s)).filter((c): c is Cell => !!c);
  const active: Cell | null = replay?.cell ?? hover ?? sel ?? nextCells[0] ?? null;
  const activeSolved = active ? (replay ? true : states[active.k] === 'o') : false;
  const activeTs = active ? (replay && replay.cell ? replay.ts : solvedAt.get(active.slug)) : undefined;
  const isNext = !!active && !replay && !hover && !sel;
  const canReplay = me.timeline.some(([s]) => BY_SLUG.has(s)) && !calm;

  return (
    <section className="panel mygrid-panel flex h-full flex-col gap-4 p-5 lg:p-7" aria-labelledby="grid-title">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex flex-col gap-1.5">
          <span className="eyebrow-m">Every problem on the ladder</span>
          <h2 id="grid-title" className="font-display caps m-0 text-[40px] leading-[0.86] font-black lg:text-[52px]">
            Your grid
          </h2>
        </div>
        <div className="flex items-end gap-4">
          <div className="font-display flex items-baseline gap-2 leading-none font-black">
            <Odometer value={replay ? replay.i : me.totalSolved} pad={3} delay={900} className="text-[56px] lg:text-[72px]" />
            <span className="text-[26px] text-white/40 lg:text-[32px]">/ {me.totalProblems}</span>
          </div>
        </div>
      </header>

      <div className="mygrid-stage" data-scanning={scanning ? '1' : undefined}>
        <div className="relative" style={{ aspectRatio: `${HC.width} / ${HC.height}` }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${HC.width.toFixed(3)} ${HC.height.toFixed(3)}`}
            role="img"
            aria-label={`Your map of the ladder: ${me.totalSolved} of ${me.totalProblems} problems solved, lit in each rank's colour.`}
            className="mygrid enter block h-full w-full overflow-visible"
            data-fine={fine ? '1' : undefined}
            onPointerMove={onMove}
            onPointerLeave={onLeave}
            onClick={onPick}
          >
            <Cells states={states} focusTier={focusIdx} register={register} />

            {/* the first three problems of your next session, numbered */}
            <g aria-hidden="true" className="marks">
              {nextCells.map((c, n) => (
                <g key={c.slug}>
                  <polygon className="ring" points={PTS[c.k]} />
                  {n === 0 && <polygon className="beacon" points={PTS[c.k]} />}
                  <text x={c.x} y={c.y} className="mark">
                    {n + 1}
                  </text>
                </g>
              ))}
            </g>

            {/* ripples where the latest sync found a solve */}
            <g aria-hidden="true">
              {[...fresh].map((slug) => {
                const c = BY_SLUG.get(slug);
                return c ? <polygon key={slug} className="ripple" points={PTS[c.k]} style={{ ['--tc' as string]: TIERS[c.tier].color }} /> : null;
              })}
            </g>

            <polyline ref={trailRef} className="trail" fill="none" />
            <g ref={cometRef} className="comet" aria-hidden="true">
              <circle r="1.7" className="halo" />
              <circle r="0.62" className="head" />
            </g>
          </svg>
        </div>
      </div>

      <div className="mg-console" aria-live="polite">
        {active ? (
          <div
            key={replay ? 'replay' : active.slug}
            data-replay={replay ? '1' : undefined}
            className="mg-console-in flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4"
          >
            <span className="verdict on-ink shrink-0" data-v={activeSolved ? 'ac' : 'wait'} style={{ alignSelf: 'flex-start' }}>
              {activeSolved ? 'Solved' : isNext ? 'Up next' : 'Not solved'}
              {activeSolved && activeTs ? ` · ${dateOf(activeTs)}` : ''}
            </span>
            <div className="flex min-w-0 flex-grow flex-col gap-0.5">
              <span className="font-display caps truncate text-[24px] leading-none font-bold lg:text-[28px]">{active.title}</span>
              <span className="font-mono flex flex-wrap items-center gap-x-2.5 text-[12px] text-white/55">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-[2px]" style={{ background: TIERS[active.tier].color }} />
                  {TIERS[active.tier].name}
                </span>
                <span>#{active.id}</span>
                <span>{active.difficulty.toLowerCase()}</span>
                <span>{active.topic}</span>
              </span>
            </div>
            {!replay && (
              <a
                href={`https://leetcode.com/problems/${active.slug}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono flex shrink-0 items-center gap-1.5 text-[12.5px] font-semibold text-white/80 no-underline hover:text-white"
              >
                Open <Icon name="external" size={13} stroke={2.2} />
              </a>
            )}
          </div>
        ) : (
          <span className="font-mono text-[13px] text-white/60">Every problem on the ladder is solved.</span>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ul className="tier-legend" aria-label="Solved per rank">
          {TIERS.map((t, i) => (
            <li key={t.key} data-here={i === rankIdx ? '1' : undefined} data-cleared={i < rankIdx ? '1' : undefined}>
              <span className="dot" style={{ background: t.color }} />
              <b>{t.name}</b>
              <span className="n">
                {perTier[i]}/{TIER_SIZE[i]}
              </span>
              <span className="bar" aria-hidden="true">
                <i style={{ width: `${(perTier[i] / TIER_SIZE[i]) * 100}%`, background: t.color }} />
              </span>
            </li>
          ))}
        </ul>
        {canReplay && (
          <button type="button" onClick={startReplay} className="replay-btn" data-on={replay ? '1' : undefined} aria-pressed={!!replay}>
            <span className="replay-ic" aria-hidden="true">
              {replay ? '■' : '▶'}
            </span>
            {replay ? 'Skip replay' : 'Replay my climb'}
          </button>
        )}
      </div>
    </section>
  );
}
