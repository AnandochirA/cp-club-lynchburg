import { events as E, type UpcomingEvent } from '@/lib/content';
import { hexPoints } from '@/lib/hexgrid';
import { Icon } from './icons';
import { Eyebrow, H2 } from './ui';

function MetaRow({
  icon,
  text,
  highlight,
}: {
  icon: 'pin' | 'chat' | 'trophy' | 'pizza';
  text: string;
  highlight?: boolean;
}) {
  return (
    <li className={`flex items-center gap-3 text-base lg:text-[17px] ${highlight ? 'font-semibold text-white' : 'text-white/75'}`}>
      <span
        aria-hidden="true"
        className={`hex-tile flex size-9 shrink-0 items-center justify-center ${highlight ? 'bg-crimson text-white' : 'bg-white/12 text-white/80'}`}
      >
        <Icon name={icon} size={16} stroke={2} />
      </span>
      {text}
    </li>
  );
}

function QuizRow() {
  return (
    <li className="flex items-center gap-3 border border-gold/40 bg-gold/[0.08] px-3 py-2.5 text-base font-semibold text-white lg:col-span-2 lg:text-[17px]">
      <span aria-hidden="true" className="hex-tile flex size-9 shrink-0 items-center justify-center bg-gold text-[#0B0C10]">
        <Icon name="hexcheck" size={17} stroke={2.2} />
      </span>
      {E.featured.quiz.text}
      <span className="font-mono ml-auto hidden text-[12.5px] font-medium text-gold lg:inline">
        {E.featured.quiz.hint}
      </span>
    </li>
  );
}

function Slot({ item }: { item: UpcomingEvent }) {
  return (
    <article
      className={`reveal notch flex flex-col justify-between gap-4 p-5 lg:gap-6 lg:p-6 ${
        item.real ? 'bg-[#0B0C10] text-white' : 'border-[1.5px] border-dashed border-ink-text/30 text-ink-text'
      }`}
    >
      <span className={`font-mono text-xs font-bold tracking-[0.14em] uppercase ${item.real ? 'text-gold' : 'text-ink-muted'}`}>
        {item.real ? item.tag : 'Coming soon'}
      </span>
      <div className="flex min-w-0 flex-col gap-1.5">
        <h3 className="font-display caps m-0 text-[28px] leading-[0.95] font-extrabold lg:text-[34px]">{item.title}</h3>
        <span className="font-mono text-[12.5px] opacity-60 lg:text-[13px]">{item.meta}</span>
      </div>
    </article>
  );
}

/** The "coming soon" mark: a hexagon whose outline draws itself, then keeps a quiet pulse. */
function QueueBadge() {
  return (
    <div className="relative mx-auto flex size-[190px] shrink-0 items-center justify-center lg:size-[220px]">
      <svg viewBox="0 0 2 2.3" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
        <polygon
          points={hexPoints(1, 1.15, 0.98)}
          fill="rgba(255,255,255,0.04)"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="0.03"
        />
        <polygon
          className="hex-trace"
          points={hexPoints(1, 1.15, 0.98)}
          fill="none"
          stroke="#E4002B"
          strokeWidth="0.05"
          strokeLinejoin="round"
          pathLength="100"
        />
      </svg>
      <div className="relative flex flex-col items-center gap-1 text-center">
        <span className="font-mono text-[11.5px] font-bold tracking-[0.2em] text-white/60 uppercase">{E.featured.every}</span>
        <span className="font-display caps text-[56px] leading-[0.85] font-black text-white lg:text-[68px]">{E.featured.day}</span>
        {E.featured.time && (
          <span className="font-mono mt-1 bg-white/15 px-3 py-1 text-[12.5px] font-semibold text-white">{E.featured.time}</span>
        )}
      </div>
    </div>
  );
}

export function Events() {
  const f = E.featured;
  const hasSide = E.upcoming.length > 0;
  return (
    <section
      id="events"
      aria-labelledby="events-title"
      className="relative flex flex-col overflow-hidden bg-paper px-5 py-19 text-ink-text lg:px-30 lg:pt-32 lg:pb-36"
    >
      <div aria-hidden="true" className="hex-bg-paper pointer-events-none absolute inset-0 [mask-image:linear-gradient(0deg,#000,transparent_70%)]" />
      <div className="relative mx-auto w-full max-w-[1200px]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div className="flex flex-col gap-3">
            <Eyebrow dark={false}>{E.eyebrow}</Eyebrow>
            <H2 id="events-title">{E.title}</H2>
          </div>
          <p className="reveal m-0 max-w-80 text-[17px] leading-[1.5] text-ink-muted lg:mb-3">{E.note}</p>
        </div>

        <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-5 lg:mt-16 lg:grid-cols-12">
          <article
            data-spot
            style={{ ['--spot' as string]: 'rgba(228,0,43,0.16)' }}
            className={`reveal notch relative grid gap-8 bg-[#0B0C10] p-6 text-white lg:grid-cols-[auto_1fr] lg:items-center lg:gap-14 lg:p-12 ${
              hasSide ? 'lg:col-span-9' : 'lg:col-span-12'
            }`}
          >
            <div className="flex flex-col items-center gap-4">
              <QueueBadge />
              <span className="verdict on-ink" data-v="wait">
                <span className="judging" aria-hidden="true">
                  <i style={{ ['--n' as string]: 0 }} />
                  <i style={{ ['--n' as string]: 1 }} />
                  <i style={{ ['--n' as string]: 2 }} />
                </span>
                In queue
              </span>
            </div>

            <div className="relative flex min-w-0 flex-col items-start gap-5">
              <span className="font-mono flex h-7 items-center gap-2 bg-crimson px-3 text-[12px] font-bold tracking-[0.12em] text-white uppercase [clip-path:polygon(0_0,calc(100%-7px)_0,100%_7px,100%_100%,0_100%)]">
                {f.pill}
              </span>
              <h3 className="font-display caps m-0 text-[clamp(3.4rem,9vw,6rem)] leading-[0.86] font-black">{f.title}</h3>
              <p className="m-0 max-w-[540px] text-base leading-[1.55] text-white/65 lg:text-lg">{f.body}</p>

              <ul className="m-0 grid grid-cols-[minmax(0,1fr)] w-full list-none gap-3 p-0 lg:grid-cols-2 lg:gap-x-6">
                {f.meta.map((m) => (
                  <MetaRow key={m.text} icon={m.icon} text={m.text} highlight={m.highlight} />
                ))}
                <QuizRow />
              </ul>

              <a
                href="#join"
                data-magnetic
                className="btn btn-primary mt-1 flex h-14 items-center justify-center gap-2.5 rounded-none px-7 text-base font-semibold text-white no-underline hover:text-white [clip-path:polygon(0_0,calc(100%-12px)_0,100%_12px,100%_100%,0_100%)]"
              >
                <span className="sheen" aria-hidden="true" />
                {f.primaryCta}
                <Icon name="arrow" size={17} stroke={2.2} className="arrow" />
              </a>
            </div>
          </article>

          {hasSide && (
            <div data-stagger className="flex flex-col gap-3 lg:col-span-3 lg:gap-5">
              {E.upcoming.map((u) => (
                <Slot key={u.title} item={u} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
