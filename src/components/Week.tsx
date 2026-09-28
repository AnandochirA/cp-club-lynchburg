import { week } from '@/lib/content';
import { Icon } from './icons';
import { Eyebrow, H2 } from './ui';

/** Mini leaderboard shown under "Practice contest". */
function MiniBoard() {
  const rows = [
    { handle: 'you', solved: 4, lead: true },
    { handle: 'off_by_one', solved: 3, lead: false },
    { handle: 'greedy_goose', solved: 2, lead: false },
  ];
  return (
    <div className="mt-1.5 flex flex-col gap-1.5 bg-white/[0.06] p-2">
      {rows.map((r, i) => (
        <div
          key={r.handle}
          className={`font-mono flex items-center gap-2.5 px-2.5 py-1.5 text-[12.5px] ${
            r.lead ? 'bg-crimson text-white' : 'text-white/65'
          }`}
        >
          <span className="w-3 shrink-0 opacity-60">{i + 1}</span>
          <span className={`flex-grow truncate ${r.lead ? 'font-bold' : ''}`}>{r.handle}</span>
          <span className={r.lead ? 'font-bold' : ''}>{r.solved}</span>
        </div>
      ))}
    </div>
  );
}

/** Seven-day streak: solved days spring in one after another. */
function Streak() {
  const done = [true, true, true, true, true, false, false];
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <div className="pop-seq flex items-center gap-1">
        {done.map((d, i) => (
          <span
            key={i}
            aria-hidden="true"
            style={{ ['--j' as string]: i }}
            className={`hex-tile flex size-8 items-center justify-center ${
              d ? 'bg-[#52D68A] text-[#08130D]' : 'bg-white/12 text-white/30'
            }`}
          >
            {d ? <Icon name="check" size={14} stroke={3.2} /> : <span className="text-xs">·</span>}
          </span>
        ))}
      </div>
      <span className="font-mono ml-1 text-[12.5px] whitespace-nowrap text-white/60">5 day streak</span>
    </div>
  );
}

export function Week() {
  return (
    <section
      id="week"
      aria-labelledby="week-title"
      className="relative flex flex-col overflow-hidden bg-paper px-5 py-19 text-ink-text lg:px-30 lg:py-32"
    >
      <div
        aria-hidden="true"
        className="hex-bg-paper pointer-events-none absolute inset-0 [mask-image:linear-gradient(0deg,#000,transparent_75%)]"
      />
      <div className="relative mx-auto w-full max-w-[1200px]">
        <div className="flex flex-col gap-3">
          <Eyebrow dark={false}>{week.eyebrow}</Eyebrow>
          <H2 id="week-title">{week.title}</H2>
        </div>

        <div className="relative mt-10 lg:mt-16">
          {/* the rail: draws itself across, hexagon nodes sit on it */}
          <span
            aria-hidden="true"
            className="reveal-x absolute top-[8px] right-[10%] left-[8px] hidden h-[3px] bg-ink-text lg:block"
          />
          <ol data-stagger className="m-0 grid grid-cols-[minmax(0,1fr)] list-none gap-3 p-0 lg:grid-cols-4 lg:gap-5">
            {week.items.map((item, i) => {
              const last = i === week.items.length - 1;
              return (
                <li key={item.title} className="reveal relative flex flex-col lg:pt-10">
                  <span
                    aria-hidden="true"
                    className="hex-tile absolute top-0 left-0 hidden size-[19px] lg:block"
                    style={{ background: last ? '#E4002B' : '#0B0C10' }}
                  />
                  <article className="notch flex flex-grow flex-col gap-3 bg-[#0B0C10] p-5 pb-6 text-white lg:p-6 lg:pb-7">
                    <span className="font-mono text-[11.5px] font-bold tracking-[0.16em] text-crimson-hi uppercase">
                      {item.label}
                    </span>
                    <h3 className="font-display caps m-0 text-[32px] leading-[0.95] font-extrabold tracking-[0.005em]">
                      {item.title}
                    </h3>
                    <p className="m-0 text-base leading-[1.5] text-white/65">{item.body}</p>
                    {item.extra === 'when' && (
                      <span className="font-mono mt-1 flex items-center gap-2 text-[13px] text-white/75">
                        <Icon name="clock" size={15} stroke={2} />
                        {week.when}
                      </span>
                    )}
                    {item.extra === 'board' && <MiniBoard />}
                    {item.extra === 'streak' && <Streak />}
                  </article>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
