'use client';

import { useMemo } from 'react';
import { LADDER } from '@/lib/hexgrid';
import { ago, daysLeftInWeek, streakWeeks, weeklyCounts } from '@/lib/momentum';
import { useInView, useNow } from './hooks';
import { Odometer } from './Odometer';

const TITLE = new Map(LADDER.map((p) => [p.slug, p.title]));
const WEEKS = 12;

/**
 * Pace. The club's rule is a weekly quota and no empty weeks, so that is what
 * this shows: the week as a row of hexagons that light up, the run of weeks in
 * a row, and twelve weeks of history. Weeks run Monday to Sunday in your time.
 */
export function Momentum({ timeline, quota }: { timeline: [string, number][]; quota: number }) {
  const now = useNow(60_000);
  const [ref, seen] = useInView<HTMLElement>();

  const stats = useMemo(() => {
    if (now === null) return null;
    const times = timeline.map(([, t]) => t);
    const weeks = weeklyCounts(times, now, WEEKS);
    const last = timeline.length ? timeline[timeline.length - 1] : null;
    return {
      weeks,
      week: weeks[weeks.length - 1].count,
      streak: streakWeeks(times, now),
      left: daysLeftInWeek(now),
      last,
    };
  }, [timeline, now]);

  const week = stats?.week ?? 0;
  const met = week >= quota;
  const cap = Math.max(quota, ...(stats?.weeks.map((w) => w.count) ?? [0]));
  const rowSize = quota > 5 ? Math.ceil(quota / 2) : quota;

  return (
    <section ref={ref} className="panel flex h-full flex-col gap-5 p-5 lg:p-7" aria-labelledby="pace-title" data-seen={seen ? '1' : undefined}>
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="flex flex-col gap-1.5">
          <span className="eyebrow-m">Pace</span>
          <h2 id="pace-title" className="font-display caps m-0 text-[34px] leading-[0.9] font-black lg:text-[40px]">
            This week
          </h2>
        </div>
        <span className="font-mono text-[12.5px] text-white/55">
          {stats ? `${stats.left} ${stats.left === 1 ? 'day' : 'days'} left · resets Monday` : ' '}
        </span>
      </header>

      <div className="flex items-center gap-5">
        <div className="quota" style={{ ['--row' as string]: rowSize }} role="img" aria-label={`${week} of ${quota} solved this week`}>
          {Array.from({ length: quota }, (_, i) => (
            <i
              key={i}
              className="hex-tile"
              data-on={seen && i < week ? '1' : undefined}
              data-met={met ? '1' : undefined}
              data-r2={i >= rowSize ? '1' : undefined}
              style={{ ['--i' as string]: i }}
            />
          ))}
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-display flex items-baseline gap-1.5 leading-none font-black">
            <Odometer value={week} pad={2} delay={1100} className="text-[56px]" />
            <span className="text-[24px] whitespace-nowrap text-white/40">/ {quota}</span>
          </span>
          <span className="font-mono text-[12.5px] text-white/60">
            {stats === null ? ' ' : met ? (week > quota ? `Quota hit, +${week - quota} bonus` : 'Quota hit') : `${quota - week} to reach this week's quota`}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 border-y border-white/8 py-4">
        <span className="hex-tile streak-hex" data-alive={stats && stats.streak > 0 ? '1' : undefined}>
          <Odometer value={stats?.streak ?? 0} className="text-[34px]" delay={1200} />
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="font-display caps text-[22px] leading-none font-bold">
            Week streak
          </span>
          <span className="text-[13.5px] leading-[1.4] text-white/60">
            {stats && stats.streak > 0
              ? 'Weeks in a row with at least one solve. Keep it alive.'
              : 'Solve one problem this week to start a streak.'}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <span className="font-mono shrink-0 text-[11.5px] tracking-[0.14em] whitespace-nowrap text-white/55 uppercase">Last {WEEKS} weeks</span>
          {stats?.last && (
            <span className="font-mono truncate pl-3 text-[12px] text-white/50">
              Last solve {ago(stats.last[1] * 1000, now!)} · {TITLE.get(stats.last[0])}
            </span>
          )}
        </div>
        <div className="weeks" style={{ ['--q' as string]: cap }} aria-hidden="true">
          {(stats?.weeks ?? Array.from({ length: WEEKS }, () => ({ start: 0, count: 0 }))).map((w, i, all) => (
            <div
              key={i}
              className="wk"
              data-now={i === all.length - 1 ? '1' : undefined}
              data-met={w.count >= quota ? '1' : undefined}
              title={stats ? `${new Date(w.start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${w.count} solved` : undefined}
              style={{ ['--w' as string]: i }}
            >
              {Array.from({ length: cap }, (_, p) => (
                <i key={p} data-on={seen && p < w.count ? '1' : undefined} style={{ ['--p' as string]: p }} />
              ))}
            </div>
          ))}
        </div>
        <div className="font-mono flex justify-between text-[11px] text-white/40" aria-hidden="true">
          <span>{WEEKS - 1} weeks ago</span>
          <span>this week</span>
        </div>
      </div>
    </section>
  );
}
