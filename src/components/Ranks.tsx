import { ranks, rankSection as R } from '@/lib/content';
import { Climb } from './Climb';
import { Icon } from './icons';
import { RankBadge, SKIN } from './RankBadge';
import { ArrowLink, Eyebrow, H2 } from './ui';

const CARD = '#101116';

/** The three steps really are a sequence, so they are numbered. */
function Steps() {
  return (
    <ol
      aria-label="How it works"
      data-stagger
      className="relative m-0 mt-16 grid grid-cols-[minmax(0,1fr)] list-none gap-3 p-0 lg:mt-24 lg:grid-cols-3 lg:gap-5"
    >
      {R.steps.map((s, i) => (
        <li
          key={s.title}
          data-spot
          className="reveal notch relative flex flex-col gap-4 border border-white/10 bg-[#101116] p-6 lg:p-8"
        >
          <span
            aria-hidden="true"
            className="font-display absolute top-3 right-5 text-[92px] leading-none font-black text-white/[0.06] lg:text-[120px]"
          >
            {i + 1}
          </span>
          <span className="hex-tile flex size-12 items-center justify-center bg-crimson text-white">
            <Icon name={s.icon} size={21} stroke={2.1} />
          </span>
          <div className="relative flex min-w-0 flex-col gap-2">
            <h3 className="font-display caps m-0 text-[32px] leading-[0.95] font-extrabold tracking-[0.005em] lg:text-[38px]">
              {s.title}
            </h3>
            <p className="m-0 text-[16px] leading-[1.5] text-muted">{s.body}</p>
            {i === 0 && (
              <div className="mt-1.5 flex flex-wrap gap-2">
                {R.difficulties.map((d) => (
                  <span
                    key={d.label}
                    className="font-mono inline-flex items-center gap-1.5 border px-2.5 py-1 text-[12px] tracking-[0.04em] uppercase"
                    style={{ borderColor: `${d.color}66`, color: d.color }}
                  >
                    <span className="size-1.5 rotate-45" style={{ background: d.color }} />
                    {d.label}
                  </span>
                ))}
              </div>
            )}
            {i === 1 && (
              <div className="mt-1.5 flex flex-col gap-2">
                <div className="flex gap-2">
                  {ranks.map((r) => (
                    <RankBadge key={r.key} rank={r} size={28} pip={false} effects={false} dim={r.earnedOnly} bg={CARD} />
                  ))}
                </div>
                <span className="font-mono text-[12.5px] leading-[1.45] text-dim">{R.placementNote}</span>
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function TrackCard({ track }: { track: (typeof R.tracks)[number] }) {
  return (
    <div
      data-spot
      style={{ ['--spot' as string]: `${track.color}26` }}
      className="reveal notch relative flex flex-col gap-3 border border-white/10 bg-[#101116] p-6 pt-7 lg:p-8"
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1" style={{ background: track.color }} />
      <span className="font-mono w-fit text-[12px] font-bold tracking-[0.14em] uppercase" style={{ color: track.color }}>
        {track.range}
      </span>
      <h3 className="font-display caps m-0 text-[40px] leading-[0.92] font-black tracking-[0.005em] lg:text-[52px]">
        {track.name}
      </h3>
      <p className="m-0 max-w-[460px] text-[16px] leading-[1.5] text-muted">{track.body}</p>
      <ArrowLink href="#join" color={track.color}>
        {track.cta}
      </ArrowLink>
    </div>
  );
}

function ExampleMember() {
  const cur = ranks[R.example.atLevel - 1];
  const next = ranks[R.example.nextLevel - 1];
  const pct = (R.example.solved / R.example.target) * 100;
  return (
    <div className="reveal notch flex flex-col gap-4 border border-white/10 bg-[#101116] p-5 lg:p-7">
      <div className="flex items-center gap-4">
        <RankBadge rank={cur} size={60} bg={CARD} />
        <div className="flex min-w-0 flex-grow flex-col gap-1">
          <span className="font-mono text-[11.5px] tracking-[0.14em] uppercase text-dim">{R.example.label}</span>
          <span className="font-display caps text-[40px] leading-[0.85] font-black lg:text-[48px]">{cur.name}</span>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-2">
          <RankBadge rank={next} size={40} dim pip={false} effects={false} bg={CARD} />
          <span className="font-mono text-[11.5px] tracking-[0.1em] uppercase text-dim">Next</span>
        </div>
      </div>
      <div
        role="progressbar"
        aria-label={`${R.example.solved} of ${R.example.target} problems solved to reach ${next.name}`}
        aria-valuemin={0}
        aria-valuemax={R.example.target}
        aria-valuenow={R.example.solved}
        className="relative h-3 overflow-hidden bg-white/10"
      >
        <div className="bar-fill h-full" style={{ width: `${pct}%`, background: SKIN[cur.key].pip }} />
      </div>
      <p className="m-0 text-base leading-[1.4] text-muted">
        <strong className="font-bold text-text">
          {R.example.solved} / {R.example.target}
        </strong>{' '}
        problems solved to reach {next.name}
      </p>
    </div>
  );
}

function ClubBoard() {
  return (
    <div className="reveal notch flex flex-col gap-3 border border-white/10 bg-[#101116] p-5 lg:p-7">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[11.5px] tracking-[0.14em] uppercase text-dim">{R.leaderboard.title}</span>
        <span className="font-mono text-[11.5px] tracking-[0.14em] uppercase text-dim">{R.leaderboard.column}</span>
      </div>
      <ul data-stagger className="m-0 flex list-none flex-col gap-2 p-0">
        {R.leaderboard.rows.map((row) => {
          const rank = ranks.find((r) => r.name === row.rank)!;
          return (
            <li key={row.handle} className={`reveal flex items-center gap-3 px-3 py-2.5 ${row.you ? 'bg-crimson' : 'bg-white/[0.05]'}`}>
              <RankBadge rank={rank} size={30} pip={false} effects={false} bg={row.you ? '#B0002A' : '#1B1C22'} />
              <span className="flex min-w-0 flex-grow flex-col">
                <span className={`font-mono truncate text-sm lg:text-[15px] ${row.you ? 'font-bold text-white' : 'text-[#E7E5E1]'}`}>
                  {row.handle}
                </span>
                <span className="font-mono text-[11.5px] uppercase" style={{ color: row.you ? '#fff' : SKIN[rank.key].label }}>
                  {row.rank}
                </span>
              </span>
              <span className="font-display shrink-0 text-[26px] leading-none font-extrabold lg:text-[30px]">{row.solved}</span>
            </li>
          );
        })}
      </ul>
      <p className="m-0 text-[15px] leading-[1.5] text-muted lg:text-base">{R.leaderboard.caption}</p>
    </div>
  );
}

export function Ranks() {
  return (
    <section
      id="ranks"
      aria-labelledby="ranks-title"
      className="relative flex flex-col bg-ink-deep px-5 py-19 lg:px-30 lg:pt-32 lg:pb-28"
    >
      <div className="relative mx-auto w-full max-w-[1200px]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
          <div className="flex flex-col gap-3">
            <Eyebrow>{R.eyebrow}</Eyebrow>
            <H2 id="ranks-title">{R.title}</H2>
          </div>
          <p className="reveal m-0 max-w-[470px] text-[17px] leading-[1.55] text-pretty text-muted lg:mb-3">
            {R.intro} <strong className="font-semibold whitespace-nowrap text-text">{R.introStrong}</strong>
          </p>
        </div>
      </div>

      <div className="relative mt-6 lg:mt-10">
        <Climb />
      </div>

      <div className="relative mx-auto w-full max-w-[1200px]">
        <Steps />

        <div data-stagger className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-3 lg:mt-5 lg:grid-cols-2 lg:gap-5">
          {R.tracks.map((t) => (
            <TrackCard key={t.key} track={t} />
          ))}
        </div>

        <div className="mt-3 grid grid-cols-[minmax(0,1fr)] items-start gap-3 lg:mt-5 lg:grid-cols-2 lg:gap-5">
          <ExampleMember />
          <ClubBoard />
        </div>

        <div className="reveal mt-10 flex items-start gap-4 lg:mt-14 lg:max-w-[900px]">
          <RankBadge rank={ranks[0]} size={48} bg="#08090C" />
          <p className="font-display caps m-0 pt-0.5 text-[30px] leading-[0.95] font-extrabold lg:text-[42px]">
            {R.reassurance.before}
            <span style={{ color: SKIN.guardian.label }}>{R.reassurance.rank}</span>
            {R.reassurance.after}
          </p>
        </div>
      </div>
    </section>
  );
}
