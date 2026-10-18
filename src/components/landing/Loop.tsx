import { loop as L } from '@/lib/content';
import { Eyebrow, H2 } from '../ui';

/** The parts of an interview loop that are not the coding round. */
export function Loop() {
  return (
    <section id="loop" aria-labelledby="loop-title" className="relative flex flex-col bg-paper px-5 py-19 text-ink-text lg:px-30 lg:py-32">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col">
        <div className="flex flex-col gap-3">
          <Eyebrow dark={false}>{L.eyebrow}</Eyebrow>
          <H2 id="loop-title">{L.title}</H2>
        </div>
        <ul data-stagger className="m-0 mt-12 grid list-none grid-cols-[minmax(0,1fr)] gap-3 p-0 lg:mt-16 lg:grid-cols-3 lg:gap-5">
          {L.cards.map((c) => (
            <li key={c.tag} data-spot data-tilt="3" className="reveal tilt-card notch card-l flex flex-col gap-4 p-6 lg:p-8">
              <span className="font-mono w-fit text-[11.5px] font-bold tracking-[0.14em] text-crimson uppercase">{c.tag}</span>
              <h3 className="font-display caps m-0 text-[34px] leading-[0.92] font-black lg:text-[40px]">{c.title}</h3>
              <p className="m-0 text-[15.5px] leading-[1.55] text-ink-muted">{c.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
