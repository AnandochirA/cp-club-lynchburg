import { ladderSection as L, ranks } from '@/lib/content';
import { TIERS } from '@/lib/hexgrid';
import { HexField } from '../motion/HexField';
import { Eyebrow, H2 } from '../ui';

/** The whole ladder as one honeycomb, with the five ranks spelled out beside it. */
export function Ladder() {
  return (
    <section id="ladder" aria-labelledby="ladder-title" className="relative flex flex-col overflow-hidden bg-paper px-5 py-19 text-ink-text lg:px-30 lg:py-32">
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-[minmax(0,1fr)] items-start gap-12 lg:grid-cols-12 lg:gap-x-12">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-5">
          <div className="flex flex-col gap-3">
            <Eyebrow dark={false}>{L.eyebrow}</Eyebrow>
            <H2 id="ladder-title">{L.title}</H2>
          </div>
          <p className="reveal m-0 max-w-[460px] text-[17px] leading-[1.55] text-ink-muted">{L.lead}</p>

          <dl className="reveal m-0 grid grid-cols-3 border-y border-ink-text/15">
            {L.stats.map((s) => (
              <div key={s.label} className="flex flex-col-reverse gap-1 py-4 [&+&]:border-l [&+&]:border-ink-text/15 [&+&]:pl-4">
                <dt className="font-mono text-[11.5px] tracking-[0.1em] text-ink-muted uppercase">{s.label}</dt>
                <dd className="font-display m-0 text-[44px] leading-none font-black lg:text-[56px]">{s.value}</dd>
              </div>
            ))}
          </dl>

          <ol className="reveal m-0 flex list-none flex-col p-0">
            {ranks.map((r, i) => (
              <li key={r.key} className="ld-rank">
                <span aria-hidden="true" className="hex-tile size-4 shrink-0" style={{ background: TIERS[i].onPaper }} />
                <span className="font-display caps text-[22px] leading-none font-extrabold">{r.name}</span>
                <span className="min-w-0 flex-1 truncate text-[14px] text-ink-muted">{r.topics.length ? r.topics.slice(0, 3).join(' · ') : r.tag}</span>
                <span className="font-mono shrink-0 text-[12px] text-ink-muted">{r.problems}</span>
              </li>
            ))}
          </ol>

          <div className="reveal flex flex-wrap gap-2">
            {L.tracks.map((t) => (
              <span key={t.name} className="font-mono inline-flex items-center gap-2 border border-ink-text/20 bg-white px-3 py-1.5 text-[12px]">
                <span className="size-2 rotate-45" style={{ background: t.color }} />
                <b className="font-semibold">{t.name}</b>
                <span className="text-ink-muted">{t.range}</span>
              </span>
            ))}
          </div>
          <p className="reveal m-0 text-[14.5px] leading-[1.5] text-ink-muted">{L.reassurance}</p>
        </div>

        <div className="reveal min-w-0 lg:col-span-7 lg:pt-6">
          <HexField />
        </div>
      </div>
    </section>
  );
}
