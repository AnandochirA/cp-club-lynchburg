import { roomSection as R } from '@/lib/content';
import { STAGES, TOTAL_MINUTES } from '@/lib/interview-kit';
import { Icon } from '../icons';
import { Eyebrow, H2 } from '../ui';

const BEFORE_CODE = STAGES.slice(0, STAGES.findIndex((s) => s.id === 'code'));
const BEFORE_MIN = BEFORE_CODE.reduce((n, s) => n + s.minutes, 0);
/** The minute each step starts at, so the playhead reaches each one on time. */
const START_AT = STAGES.map((_, i) => STAGES.slice(0, i).reduce((n, s) => n + s.minutes, 0));

/**
 * The mock round, drawn to scale: each step's width is its minutes. The
 * bracket under it is the point of the section: almost half the round
 * happens before any code is written.
 */
export function Room() {
  return (
    <section id="room" aria-labelledby="room-title" className="relative flex flex-col overflow-hidden bg-paper px-5 py-19 text-ink-text lg:px-30 lg:py-32">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-12 lg:items-end lg:gap-x-12">
          <div className="flex flex-col gap-3 lg:col-span-7">
            <Eyebrow dark={false}>{R.eyebrow}</Eyebrow>
            <H2 id="room-title">{R.title}</H2>
          </div>
          <p className="reveal m-0 max-w-[480px] text-[17px] leading-[1.55] text-ink-muted lg:col-span-5">{R.lead}</p>
        </div>

        <figure className="reveal rm-fig m-0 mt-12 lg:mt-18">
          <figcaption className="font-mono mb-3 text-[11.5px] lg:mb-9 tracking-[0.12em] text-ink-muted uppercase">
            {R.barLabel} · {TOTAL_MINUTES} min
          </figcaption>
          <div className="relative">
          <ol className="rm-bar m-0 list-none p-0" style={{ ['--t' as string]: TOTAL_MINUTES, ['--n' as string]: STAGES.length }}>
            {STAGES.map((s, i) => (
              <li key={s.id} className="rm-seg" data-code={s.id === 'code' ? '1' : undefined} style={{ ['--m' as string]: s.minutes, ['--s' as string]: START_AT[i] }}>
                <span className="rm-top font-mono">
                  <span className="rm-n">{i + 1}</span>
                  <span className="rm-min">{s.minutes} min</span>
                </span>
                <span className="rm-name">{s.title}</span>
                <span className="rm-goal">{s.goal}</span>
              </li>
            ))}
          </ol>
          <span className="rm-head" aria-hidden="true" />
          </div>
          <div className="rm-brace" style={{ ['--b' as string]: BEFORE_MIN, ['--t' as string]: TOTAL_MINUTES }}>
            <span className="font-mono">
              <b>{BEFORE_MIN} minutes</b> before a single line of code
            </span>
          </div>
        </figure>

        <ul data-stagger className="m-0 mt-14 grid list-none grid-cols-[minmax(0,1fr)] gap-3 p-0 sm:grid-cols-2 lg:mt-20 lg:grid-cols-3 lg:gap-4">
          {R.features.map((f) => (
            <li key={f.title} data-spot data-tilt="3" style={{ ['--spot' as string]: 'rgba(228,0,43,0.10)' }} className="reveal tilt-card notch card-l flex flex-col gap-4 p-6 lg:p-7">
              <span aria-hidden="true" className="spin-hex hex-tile flex size-12 items-center justify-center bg-ink text-white">
                <Icon name={f.icon} size={20} stroke={2.1} />
              </span>
              <div className="flex flex-col gap-1.5">
                <h3 className="font-display caps m-0 text-[28px] leading-[0.95] font-extrabold">{f.title}</h3>
                <p className="m-0 text-[15.5px] leading-[1.5] text-ink-muted">{f.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
