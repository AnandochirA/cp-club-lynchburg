'use client';

import { LADDER, TIERS } from '@/lib/hexgrid';
import { ago } from '@/lib/momentum';
import { useNow } from './hooks';

const BY_SLUG = new Map(LADDER.map((p) => [p.slug, p]));

/**
 * The last few accepted submissions, laid out like a judge's log: an AC chip,
 * the problem, and how long ago. It is the same data the map replays, so the
 * dashboard reads like the scoreboard of your own contest.
 */
export function RecentLog({ timeline, count = 4 }: { timeline: [string, number][]; count?: number }) {
  const now = useNow(60_000);
  const rows = timeline
    .filter(([slug]) => BY_SLUG.has(slug))
    .slice(-count)
    .reverse();
  if (rows.length === 0) return null;

  return (
    <section className="rlog" aria-label="Recent submissions">
      <span className="font-mono text-[11.5px] tracking-[0.14em] text-white/55 uppercase">Recent submissions</span>
      <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
        {rows.map(([slug, ts], i) => {
          const p = BY_SLUG.get(slug)!;
          return (
            <li key={slug} style={{ ['--i' as string]: i }}>
              <span className="verdict on-ink" data-v="ac">
                AC
              </span>
              <span className="dot" style={{ background: TIERS[p.tier].color }} aria-hidden="true" />
              <span className="min-w-0 flex-grow truncate text-[14px] text-white/90">{p.title}</span>
              <span className="font-mono shrink-0 text-[11.5px] text-white/45">{now === null ? '' : ago(ts * 1000, now)}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
