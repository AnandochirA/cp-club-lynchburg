import { why } from '@/lib/content';
import { Icon } from './icons';
import { Eyebrow, H2 } from './ui';

/** One enamel colour per card, borrowed from the rank tiers. */
const ENAMEL = ['#B9B2A8', '#D98A4A', '#B5C0D4', '#F4C340'];

export function WhyJoin() {
  return (
    <section
      id="why"
      aria-labelledby="why-title"
      className="relative z-1 flex flex-col overflow-hidden bg-ink px-5 py-19 text-text lg:px-30 lg:py-32"
    >
      <div aria-hidden="true" className="hex-bg-ink pointer-events-none absolute inset-0 opacity-70 [mask-image:linear-gradient(180deg,#000,transparent_85%)]" />
      <div className="relative mx-auto w-full max-w-[1200px]">
        <div className="flex flex-col gap-3">
          <Eyebrow>{why.eyebrow}</Eyebrow>
          <H2 id="why-title">{why.title}</H2>
        </div>
        <div data-stagger className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-3 lg:mt-16 lg:grid-cols-4 lg:gap-5">
          {why.cards.map((c, i) => (
            <article
              key={c.title}
              data-spot
              style={{ ['--spot' as string]: 'rgba(228,0,43,0.13)' }}
              className="reveal lift notch flex items-start gap-4 bg-paper p-5 pb-6 text-ink-text lg:flex-col lg:gap-6 lg:p-7 lg:pb-9"
            >
              <span
                aria-hidden="true"
                className="hex-tile flex size-14 shrink-0 items-center justify-center text-[#0B0C10] lg:size-[68px]"
                style={{ background: ENAMEL[i % ENAMEL.length] }}
              >
                <Icon name={c.icon} size={24} stroke={2.1} />
              </span>
              <div className="flex flex-col gap-2">
                <h3 className="font-display caps m-0 text-[26px] leading-[0.98] font-extrabold tracking-[0.005em] lg:text-[32px]">
                  {c.title}
                </h3>
                <p className="m-0 text-base leading-[1.5] text-ink-muted lg:text-[16.5px]">{c.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
