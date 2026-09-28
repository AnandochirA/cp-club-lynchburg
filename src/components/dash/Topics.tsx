'use client';

import { useMemo } from 'react';
import { RANK_KEYS, curriculum, type RankKey } from '@/lib/curriculum';
import { TIERS } from '@/lib/hexgrid';
import { rankName } from '@/lib/content';
import { useInView } from './hooks';

type Row = { topic: string; total: number; done: boolean[] };

/**
 * Every topic on the ladder as a row of hexagons, one per problem, filling
 * left to right as you solve them. Your current rank's topics are bright; the
 * ranks above are dim until you get there.
 */
export function Topics({ solved, rank }: { solved: ReadonlySet<string>; rank: RankKey }) {
  const [ref, seen] = useInView<HTMLElement>();
  const rankIdx = RANK_KEYS.indexOf(rank);

  const groups = useMemo(
    () =>
      RANK_KEYS.map((key) => {
        const rows: Row[] = [];
        for (const p of curriculum[key]) {
          let row = rows.find((r) => r.topic === p.topic);
          if (!row) rows.push((row = { topic: p.topic, total: 0, done: [] }));
          row.total++;
          row.done.push(solved.has(p.slug));
        }
        return { key, rows };
      }),
    [solved],
  );

  let rowNo = 0;
  return (
    <section ref={ref} className="panel flex h-full flex-col gap-5 p-5 lg:p-7" aria-labelledby="topics-title">
      <header className="flex flex-col gap-1.5">
        <span className="eyebrow-m">By topic</span>
        <h2 id="topics-title" className="font-display caps m-0 text-[34px] leading-[0.9] font-black lg:text-[40px]">
          Skill map
        </h2>
      </header>

      <div className="flex flex-col gap-4">
        {groups.map((g, gi) => (
          <div key={g.key} className="tp-group" data-here={gi === rankIdx ? '1' : undefined} data-past={gi < rankIdx ? '1' : undefined} style={{ ['--tc' as string]: TIERS[gi].color }}>
            <div className="tp-head">
              <span className="dot" />
              <span>{rankName(g.key)}</span>
              {gi < rankIdx && <span className="tp-tag">cleared</span>}
              {gi === rankIdx && <span className="tp-tag">you are here</span>}
            </div>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {g.rows.map((r) => {
                const n = r.done.filter(Boolean).length;
                const r0 = rowNo++;
                return (
                  <li key={r.topic} className="tp-row">
                    <span className="tp-name">{r.topic}</span>
                    <span className="tp-pips" aria-hidden="true">
                      {r.done.map((d, i) => (
                        <i key={i} className="hex-tile" data-on={seen && d ? '1' : undefined} style={{ ['--d' as string]: r0 * 55 + i * 16 }} />
                      ))}
                    </span>
                    <span className="tp-n">
                      <span className="sr-only">
                        {r.topic}:{' '}
                      </span>
                      {n}/{r.total}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
