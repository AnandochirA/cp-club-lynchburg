import { events as E, type UpcomingEvent } from '@/lib/content';
import { Icon } from './icons';
import { Eyebrow, H2, PingDot } from './ui';

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
    <li
      className={`flex items-center gap-3 text-base lg:text-[17px] ${
        highlight ? 'font-semibold text-text' : 'text-soft'
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex size-8.5 shrink-0 items-center justify-center rounded-[10px] lg:size-9.5 lg:rounded-[11px] ${
          highlight ? 'bg-crimson/20 text-crimson-hi' : 'bg-line text-muted'
        }`}
      >
        <Icon name={icon} size={17} stroke={2} />
      </span>
      {text}
    </li>
  );
}

function QuizRow() {
  return (
    <li className="flex items-center gap-3 rounded-[14px] border px-2.5 py-2.5 pr-4 text-base font-semibold text-text lg:col-span-2 lg:text-[17px]"
      style={{ borderColor: 'rgba(246,196,83,0.32)', background: 'rgba(246,196,83,0.07)' }}
    >
      <span
        aria-hidden="true"
        className="flex size-8.5 shrink-0 items-center justify-center rounded-[10px] text-gold lg:size-9.5 lg:rounded-[11px]"
        style={{ background: 'rgba(246,196,83,0.16)' }}
      >
        <Icon name="hexcheck" size={18} stroke={2} />
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
      className={`reveal flex flex-col justify-between gap-3 rounded-2xl p-4 px-4.5 lg:flex-grow lg:gap-5 lg:rounded-[22px] lg:px-7 lg:py-6.5 ${
        item.real ? '' : 'border-[1.5px] border-dashed border-hair'
      }`}
      style={item.real ? { border: '1.5px solid rgba(246,196,83,0.34)' } : undefined}
    >
      <span
        className={`font-mono text-xs tracking-[0.08em] uppercase lg:text-[12.5px] ${
          item.real ? 'font-bold text-gold' : 'text-dim'
        }`}
      >
        {item.real ? item.tag : 'Coming soon'}
      </span>
      <div className="flex min-w-0 flex-col gap-1.5">
        <h3
          className={`font-display m-0 text-[18px] leading-[1.2] font-bold lg:text-2xl ${
            item.real ? 'text-text' : 'text-soft'
          }`}
        >
          {item.title}
        </h3>
        <span className="font-mono text-[12.5px] text-dim lg:text-[13px]">{item.meta}</span>
      </div>
    </article>
  );
}

export function Events() {
  const f = E.featured;
  const hasSide = E.upcoming.length > 0;
  return (
    <section
      id="events"
      aria-labelledby="events-title"
      className="flex flex-col bg-ink px-5 py-19 lg:px-30 lg:pt-25 lg:pb-32"
    >
      <div className="mx-auto w-full max-w-[1200px]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div className="reveal flex flex-col gap-3">
            <Eyebrow>{E.eyebrow}</Eyebrow>
            <H2 id="events-title">{E.title}</H2>
          </div>
          <p className="m-0 max-w-80 text-[17px] leading-[1.5] text-muted lg:mb-2">{E.note}</p>
        </div>

        <div className="mt-7 grid gap-5 lg:mt-14 lg:grid-cols-12">
          <article
            className={`card-d reveal relative flex flex-col gap-5 overflow-hidden rounded-[22px] p-5 lg:flex-row lg:gap-9 lg:rounded-[26px] lg:p-9 ${
              hasSide ? 'lg:col-span-9' : 'lg:col-span-12'
            }`}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-20 -left-15 h-55 w-65 rounded-full lg:-top-35 lg:-left-30 lg:h-105 lg:w-130"
              style={{
                background:
                  'radial-gradient(closest-side, rgba(228,0,43,0.27), rgba(228,0,43,0))',
              }}
            />

            {/* when */}
            <div
              className="gloss relative flex h-22 w-23.5 shrink-0 flex-col items-center justify-center gap-0.75 rounded-2xl px-1.5 lg:h-47 lg:w-49 lg:gap-2.5 lg:rounded-[22px] lg:px-3.5 lg:shadow-[inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-1px_0_rgba(0,0,0,0.2),0_24px_48px_-20px_rgba(228,0,43,0.8)]"
            >
              <span className="font-mono text-[11px] font-bold tracking-[0.12em] uppercase lg:text-[13px] lg:tracking-[0.14em]">
                {f.every}
              </span>
              <span className="font-display text-center text-2xl leading-none font-extrabold tracking-[-0.005em] lg:text-[40px] lg:tracking-[-0.01em]">
                {f.day}
              </span>
              {f.time && (
                <span className="font-mono text-[11.5px] font-medium text-white/94 lg:flex lg:h-7 lg:items-center lg:rounded-full lg:bg-white/20 lg:px-3 lg:text-[13px] lg:font-semibold lg:text-white">
                  {f.time}
                </span>
              )}
            </div>

            {/* what */}
            <div className="relative flex min-w-0 flex-grow flex-col items-start gap-4 lg:gap-5">
              <span className="font-mono flex h-6.5 items-center gap-2 rounded-full bg-crimson/20 px-2.5 text-xs font-bold tracking-[0.08em] uppercase text-crimson-hi lg:h-7.5 lg:px-3 lg:text-[12.5px]">
                <PingDot />
                {f.pill}
              </span>
              <h3 className="font-display m-0 -mt-1 text-[22px] leading-[1.15] font-bold tracking-[-0.015em] lg:text-[46px] lg:leading-[1.02] lg:font-extrabold lg:tracking-[-0.01em]">
                {f.title}
              </h3>
              <p className="m-0 -mt-1.5 max-w-[540px] text-base leading-[1.5] text-muted lg:-mt-2.5 lg:text-lg">
                {f.body}
              </p>

              <ul className="m-0 flex w-full list-none flex-col gap-2.5 p-0 lg:grid lg:grid-cols-2 lg:gap-x-6 lg:gap-y-3">
                {f.meta.map((m) => (
                  <MetaRow key={m.text} icon={m.icon} text={m.text} highlight={m.highlight} />
                ))}
                <QuizRow />
              </ul>

              <div className="mt-1 flex w-full flex-col gap-2.5 sm:flex-row sm:gap-3">
                <a
                  href="#join"
                  className="btn btn-primary flex h-13 items-center justify-center gap-2.5 rounded-[14px] px-6 text-base font-semibold text-white no-underline hover:text-white"
                >
                  <span className="sheen" aria-hidden="true" />
                  {f.primaryCta}
                </a>
              </div>
            </div>
          </article>

          {hasSide && (
            <div className="flex flex-col gap-3 lg:col-span-3 lg:gap-5">
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
