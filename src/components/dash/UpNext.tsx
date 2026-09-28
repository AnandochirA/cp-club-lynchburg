'use client';

import { memberPage as M, rankSection } from '@/lib/content';
import type { Problem } from '@/lib/curriculum';
import { Icon } from '../icons';

const diffColor = (d: string) => rankSection.difficulties.find((x) => x.label === d.toLowerCase())?.color ?? '#55575f';

/**
 * The next three problems, as paper tickets. Hovering (or focusing) one pulses
 * its numbered hexagon on the map, so the list and the picture read as one.
 */
export function UpNext({
  items,
  rankName,
  left,
  divineReady,
  onHover,
}: {
  items: Problem[];
  rankName: string;
  left: number;
  /** All 30 Hards are done but the rank still needs an officer. */
  divineReady: boolean;
  onHover: (slug: string | null) => void;
}) {
  return (
    <section aria-labelledby="next-title" className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 px-1">
        <div className="flex flex-col gap-1.5">
          <span className="eyebrow-m">Your next session</span>
          <h2 id="next-title" className="font-display caps m-0 text-[40px] leading-[0.86] font-black lg:text-[52px]">
            Up next
          </h2>
        </div>
        <p className="font-mono m-0 flex items-center gap-2.5 text-[12.5px] text-white/60">
          {left > 0 && (
            <span>
              {left} left in {rankName}
            </span>
          )}
          <span className="hidden items-center gap-1.5 sm:flex">
            <kbd className="kbd">S</kbd> syncs after you solve
          </span>
        </p>
      </header>

      {items.length === 0 ? (
        <p className="panel m-0 p-5 text-[16px] leading-[1.5] text-white/80 lg:p-7">
          {divineReady ? M.divineReady : M.allSolved}
        </p>
      ) : (
        <ol className="tickets m-0 list-none p-0">
          {items.map((p, n) => (
            <li key={p.slug} className="tk-wrap" style={{ ['--n' as string]: n }}>
              <a
                href={`https://leetcode.com/problems/${p.slug}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="tk"
                data-spot
                onPointerEnter={(e) => e.pointerType === 'mouse' && onHover(p.slug)}
                onPointerLeave={() => onHover(null)}
                onFocus={() => onHover(p.slug)}
                onBlur={() => onHover(null)}
              >
                <span className="tk-num font-display" aria-hidden="true">
                  {n + 1}
                </span>
                <span className="tk-band" style={{ background: diffColor(p.difficulty) }} aria-hidden="true" />
                <span className="font-mono text-[11.5px] tracking-[0.14em] text-ink-muted uppercase">{p.topic}</span>
                <span className="font-display caps tk-title">{p.title}</span>
                <span className="font-mono flex items-center gap-3 text-[12.5px] text-ink-muted">
                  <span>#{p.id}</span>
                  <span className="font-bold" style={{ color: diffColor(p.difficulty) }}>
                    {p.difficulty.toLowerCase()}
                  </span>
                </span>
                <span className="tk-cut" aria-hidden="true" />
                <span className="tk-go">
                  Solve on LeetCode <Icon name="arrow" size={17} stroke={2.4} className="arrow" />
                </span>
              </a>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
