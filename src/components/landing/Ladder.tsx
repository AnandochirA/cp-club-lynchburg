import { ladderSection as L } from '@/lib/content';
import { Climb } from '../Climb';
import { CountUp } from '../motion/CountUp';
import { Eyebrow, H2 } from '../ui';

/**
 * The ladder. The heart of it is the Climb: a pinned scene where scrolling
 * fills the honeycomb from Guardian to Divine. No overflow clipping on this
 * section, or the scene's sticky stage would stop sticking.
 */
export function Ladder() {
  return (
    <section id="ladder" aria-labelledby="ladder-title" className="relative flex flex-col bg-ink-deep px-5 py-19 text-text lg:px-30 lg:pt-32 lg:pb-28">
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-12 lg:items-end lg:gap-x-12">
        <div className="flex flex-col gap-3 lg:col-span-7">
          <Eyebrow>{L.eyebrow}</Eyebrow>
          <H2 id="ladder-title">{L.title}</H2>
        </div>
        <div className="flex flex-col gap-6 lg:col-span-5">
          <p className="reveal m-0 max-w-[460px] text-[17px] leading-[1.55] text-muted">{L.lead}</p>
          <dl className="reveal m-0 grid grid-cols-3 border-y border-white/12">
            {L.stats.map((s) => (
              <div key={s.label} className="flex flex-col-reverse gap-1 py-4 [&+&]:border-l [&+&]:border-white/12 [&+&]:pl-4">
                <dt className="font-mono text-[11.5px] tracking-[0.1em] text-dim uppercase">{s.label}</dt>
                <dd className="font-display m-0 text-[44px] leading-none font-black lg:text-[52px]">
                  <CountUp value={s.value} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="relative mt-6 lg:mt-10">
        <Climb />
      </div>

      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="reveal flex flex-wrap gap-2">
          {L.tracks.map((t) => (
            <span key={t.name} className="font-mono inline-flex items-center gap-2 border border-white/15 bg-white/[0.03] px-3 py-1.5 text-[12px]">
              <span className="size-2 rotate-45" style={{ background: t.color }} />
              <b className="font-semibold text-text">{t.name}</b>
              <span className="text-dim">{t.range}</span>
            </span>
          ))}
        </div>
        <p className="reveal m-0 max-w-[520px] text-[14.5px] leading-[1.5] text-muted">{L.reassurance}</p>
      </div>
    </section>
  );
}
