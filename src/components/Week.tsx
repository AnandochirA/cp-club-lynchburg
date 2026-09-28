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
    <div className="mt-1.5 flex flex-col gap-1.5 rounded-xl bg-black/25 p-2.5">
      {rows.map((r, i) => (
        <div
          key={r.handle}
          className={`font-mono flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[12.5px] ${
            r.lead ? 'bg-crimson/16 text-text' : 'text-muted'
          }`}
        >
          <span className="w-3 shrink-0 text-dim">{i + 1}</span>
          <span className={`flex-grow truncate ${r.lead ? 'font-bold' : ''}`}>{r.handle}</span>
          <span className={r.lead ? 'font-bold text-crimson-hi' : ''}>{r.solved}</span>
        </div>
      ))}
    </div>
  );
}

/** Seven-day streak strip shown under "Problem of the day". */
function Streak() {
  const done = [true, true, true, true, true, false, false];
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {done.map((d, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`flex size-7.5 items-center justify-center rounded-[9px] lg:size-8.5 ${
            d ? 'bg-crimson/22 text-crimson-hi' : 'border border-hair text-hair'
          }`}
        >
          {d ? <Icon name="check" size={14} stroke={3} /> : <span className="text-xs">·</span>}
        </span>
      ))}
      <span className="font-mono ml-1 text-[12.5px] whitespace-nowrap text-muted">5 day streak</span>
    </div>
  );
}

export function Week() {
  return (
    <section
      id="week"
      aria-labelledby="week-title"
      className="flex flex-col bg-ink px-5 py-19 lg:px-30 lg:py-34"
    >
      <div className="mx-auto w-full max-w-[1200px]">
        <div className="reveal flex flex-col gap-3">
          <Eyebrow>{week.eyebrow}</Eyebrow>
          <H2 id="week-title">{week.title}</H2>
        </div>
        <ol className="m-0 mt-8 flex list-none flex-col gap-3.5 p-0 lg:mt-14 lg:grid lg:grid-cols-4 lg:gap-5">
          {week.items.map((item, i) => {
            const last = i === week.items.length - 1;
            return (
              <li key={item.title} className="reveal flex gap-3.5 lg:flex-col lg:gap-0">
                {/* rail — vertical on phone, horizontal on desktop */}
                <span
                  aria-hidden="true"
                  className="flex w-3.5 shrink-0 flex-col items-center pt-5.5 lg:mb-5 lg:h-3.5 lg:w-full lg:flex-row lg:pt-0"
                >
                  <span
                    className={`size-3.5 shrink-0 rounded-full ${
                      last
                        ? 'bg-crimson'
                        : 'border-2 border-crimson bg-ink shadow-[0_0_12px_rgba(228,0,43,0.55)]'
                    }`}
                  />
                  {!last && (
                    <span className="my-1.5 -mb-9 w-0.5 flex-grow bg-gradient-to-b from-[#30313C] to-[#22232B] lg:my-0 lg:mb-0 lg:ml-1.5 lg:h-0.5 lg:w-auto lg:bg-gradient-to-r" />
                  )}
                </span>
                <article className="card-d flex flex-grow flex-col gap-2 rounded-[18px] p-4.5 pb-5 lg:rounded-[22px] lg:p-6">
                  <span className="font-mono text-[12.5px] font-medium tracking-[0.08em] uppercase text-crimson-hi">
                    {item.label}
                  </span>
                  <h3 className="font-display m-0 text-[21px] leading-[1.2] font-bold tracking-[-0.015em]">
                    {item.title}
                  </h3>
                  <p className="m-0 text-base leading-[1.5] text-muted">{item.body}</p>
                  {item.extra === 'when' && (
                    <span className="font-mono mt-1 flex items-center gap-2 text-[13px] text-[#C9C9CD]">
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
    </section>
  );
}
