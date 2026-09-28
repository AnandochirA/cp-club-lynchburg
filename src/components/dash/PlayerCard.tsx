'use client';

import { useRef } from 'react';
import { memberPage as M, rankName, ranks, type Rank } from '@/lib/content';
import { hexPoints, TIERS } from '@/lib/hexgrid';
import type { MemberView } from '@/lib/member-view';
import { Icon } from '../icons';
import { RankBadge } from '../RankBadge';
import { useCalm, useFinePointer } from './hooks';
import { Odometer } from './Odometer';
import { RecentLog } from './RecentLog';

const FACE = '#101116';

/** "Sep 2026", the same on server and browser (fixed locale and timezone). */
const since = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });

/**
 * The member's rank as a collectible card. On a desktop it leans towards the
 * pointer and a foil glare follows it; on a phone it sways gently by itself.
 * The medal floats a little in front of the card, the way a hologram would.
 */
export function PlayerCard({
  me,
  rank,
  next,
  aimingAtDivine,
}: {
  me: MemberView;
  rank: Rank;
  next: Rank | null;
  aimingAtDivine: boolean;
}) {
  const fine = useFinePointer();
  const calm = useCalm();
  const box = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const tier = TIERS[rank.level - 1];

  const lean = (e: React.PointerEvent) => {
    if (!fine || calm || e.pointerType !== 'mouse') return;
    const el = box.current;
    if (!el) return;
    const { clientX, clientY } = e;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      const px = ((clientX - r.left) / r.width - 0.5) * 2;
      const py = ((clientY - r.top) / r.height - 0.5) * 2;
      el.style.setProperty('--rx', `${(-py * 7).toFixed(2)}deg`);
      el.style.setProperty('--ry', `${(px * 9).toFixed(2)}deg`);
      el.style.setProperty('--nx', px.toFixed(3));
      el.style.setProperty('--ny', py.toFixed(3));
      el.style.setProperty('--gx', `${((px + 1) * 50).toFixed(1)}%`);
      el.style.setProperty('--gy', `${((py + 1) * 50).toFixed(1)}%`);
      el.dataset.hot = '1';
    });
  };
  const settle = () => {
    const el = box.current;
    if (!el) return;
    cancelAnimationFrame(raf.current);
    for (const v of ['--rx', '--ry', '--nx', '--ny', '--gx', '--gy']) el.style.removeProperty(v);
    delete el.dataset.hot;
  };

  const { solved, total } = me.progress;
  const label = M.inRank(solved, total, next ? rankName(next.key) : null);
  const complete = solved >= total;

  return (
    <div
      ref={box}
      className="pcard dx"
      style={{ ['--dx' as string]: 1, ['--tier' as string]: tier.color }}
      onPointerMove={lean}
      onPointerLeave={settle}
    >
      <div className="pcard-face notch" data-sway={fine ? undefined : '1'}>
        <div className="pcard-bg" aria-hidden="true" />
        <div className="pcard-glare" aria-hidden="true" />

        <div className="pcard-head relative flex items-center justify-between gap-3">
          <span className="font-mono text-[11.5px] tracking-[0.14em] text-white/55 uppercase">
            {M.rank} · Level {rank.level} of {ranks.length}
          </span>
          <span className="verdict on-ink verdict-stamp" data-v="ac" style={{ animationDelay: '1.2s' }}>
            <span className="tick">
              <Icon name="check" size={9} stroke={4} />
            </span>
            Verified
          </span>
        </div>

        <div className="pcard-col">
        <div className="pcard-stage" aria-hidden="true">
          <svg className="orbit orbit-a" viewBox="-50 -50 100 100">
            <polygon points={hexPoints(0, 0, 47)} />
          </svg>
          <svg className="orbit orbit-b" viewBox="-50 -50 100 100">
            <polygon points={hexPoints(0, 0, 40)} />
          </svg>
          <span className="pcard-impact" />
          <span className="pcard-medal">
            <RankBadge rank={rank} size={172} bg={FACE} />
          </span>
          <span className="pcard-floor" />
        </div>

        <h2 className="pcard-name font-display caps" aria-label={rank.name}>
          <span aria-hidden="true" className="pcard-line">
            {rank.name.split('').map((ch, i) => (
              <span key={i} className="ch" style={{ ['--c' as string]: i }}>
                {ch}
              </span>
            ))}
          </span>
        </h2>

        <div className="relative flex flex-col items-center gap-1 text-center">
          <a
            href={`https://leetcode.com/u/${encodeURIComponent(me.username)}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[14px] text-white/85 no-underline hover:text-white"
          >
            {M.linkedAs}: {me.username}
          </a>
          <span className="font-mono text-[12px] text-white/45">On the ladder since {since(me.joinedAt)}</span>
        </div>
        </div>

        <div className="pcard-col">
        <RecentLog timeline={me.timeline} />

        <div className="pcard-gauge">
          <div className="flex items-end justify-between gap-3">
            <span className="font-mono text-[11.5px] tracking-[0.14em] text-white/55 uppercase">
              {next ? `To ${next.name}` : `${rank.name} set`}
            </span>
            <span className="font-display flex items-baseline gap-1.5 leading-none font-black text-white">
              <Odometer value={solved} pad={String(total).length} delay={700} className="text-[44px]" />
              <span className="text-[24px] text-white/40">/ {total}</span>
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={solved}
            className="gauge"
            style={{ ['--n' as string]: total }}
          >
            {Array.from({ length: total }, (_, i) => (
              <i
                key={i}
                data-on={i < solved ? '1' : undefined}
                data-lead={i === solved - 1 && !complete ? '1' : undefined}
                data-m={(i + 1) % 10 === 0 ? '1' : undefined}
                style={{ ['--i' as string]: i }}
              />
            ))}
          </div>
          <p className="m-0 text-[14.5px] leading-[1.45] font-semibold text-white/90">{label}</p>
          {aimingAtDivine && <p className="m-0 text-[13.5px] leading-[1.5] text-gold">{M.divineNote}</p>}
        </div>

        <ol className="pips" aria-label="Ranks" style={{ ['--prog' as string]: (rank.level - 1) / (ranks.length - 1) }}>
          {ranks.map((r, i) => {
            const state = i < rank.level - 1 ? 'done' : i === rank.level - 1 ? 'now' : 'todo';
            return (
              <li key={r.key} data-state={state} style={{ ['--tc' as string]: TIERS[i].color }}>
                <span className="pip hex-tile">{state === 'done' ? <Icon name="check" size={13} stroke={3.4} /> : r.level}</span>
                <span className="pip-n">{r.name}</span>
                <span className="sr-only">{state === 'done' ? ' cleared' : state === 'now' ? ' current rank' : ' locked'}</span>
              </li>
            );
          })}
        </ol>
        </div>
      </div>
    </div>
  );
}
