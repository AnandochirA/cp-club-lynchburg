import { leadership } from '@/lib/content';
import { Eyebrow, H2 } from './ui';

/** A hexagonal monogram: the club's shape, with a faint honeycomb inside. */
function Monogram({ letter }: { letter: string }) {
  return (
    <span
      aria-hidden="true"
      className="hex-tile relative flex size-24 shrink-0 items-center justify-center overflow-hidden bg-crimson lg:size-32"
    >
      <span className="hex-bg-ink absolute inset-0 opacity-60" />
      <span className="font-display relative text-[64px] leading-none font-black text-white lg:text-[88px]">{letter}</span>
    </span>
  );
}

export function Leadership() {
  return (
    <section
      id="team"
      aria-labelledby="team-title"
      className="relative flex flex-col overflow-hidden bg-paper px-5 py-19 text-ink-text lg:px-30 lg:py-32"
    >
      <div aria-hidden="true" className="hex-bg-paper pointer-events-none absolute inset-0 [mask-image:linear-gradient(180deg,#000,transparent_70%)]" />
      <div className="relative mx-auto w-full max-w-[1200px]">
        <div className="flex flex-col gap-3">
          <Eyebrow dark={false}>{leadership.eyebrow}</Eyebrow>
          <H2 id="team-title">{leadership.title}</H2>
        </div>
        <div data-stagger className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-3 lg:mt-16 lg:grid-cols-2 lg:gap-5">
          {leadership.people.map((p) => (
            <article
              key={p.name}
              data-tilt="4"
              data-spot
              style={{ ['--spot' as string]: 'rgba(228,0,43,0.2)' }}
              className="reveal notch flex items-center gap-5 bg-[#0B0C10] p-5 text-white lg:gap-8 lg:p-8"
            >
              <Monogram letter={p.initial} />
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="font-mono text-[12px] font-bold tracking-[0.16em] text-crimson-hi uppercase">{p.role}</span>
                <h3 className="font-display caps m-0 text-[48px] leading-[0.88] font-black lg:text-[64px]">{p.name}</h3>
                <span className="font-mono text-[13px] text-white/60">{p.line}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
