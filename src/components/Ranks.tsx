import { ranks, rankSection as R } from '@/lib/content';
import { Icon } from './icons';
import { RankBadge, SKIN } from './RankBadge';
import { ArrowLink, Chip, Eyebrow, H2 } from './ui';

const CARD = '#14151B';

function Steps() {
  return (
    <ol
      aria-label="How it works"
      className="relative m-0 mt-7 flex list-none flex-col gap-3 p-0 lg:mt-14 lg:grid lg:grid-cols-3 lg:gap-5"
    >
      {R.steps.map((s, i) => (
        <li
          key={s.title}
          className="card-d reveal flex gap-3.5 rounded-[18px] p-4.5 pb-5 lg:flex-col lg:gap-4 lg:rounded-[22px] lg:p-7"
        >
          <span
            aria-hidden="true"
            className="gloss flex size-10.5 shrink-0 items-center justify-center rounded-[13px]"
          >
            <Icon name={s.icon} size={20} stroke={2} />
          </span>
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="font-mono text-xs tracking-[0.1em] uppercase text-dim lg:text-[13px]">
              Step 0{i + 1}
            </span>
            <h3 className="font-display m-0 text-xl leading-[1.2] font-bold tracking-[-0.015em] lg:text-[25px]">
              {s.title}
            </h3>
            <p className="m-0 text-[15.5px] leading-[1.5] text-muted lg:text-[17px]">{s.body}</p>
            {i === 0 && (
              <div className="mt-1.5 flex flex-wrap gap-2">
                {R.difficulties.map((d) => (
                  <span
                    key={d.label}
                    className="font-mono inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px]"
                    style={{ borderColor: `${d.color}55`, color: d.color }}
                  >
                    <span className="size-1.5 rounded-full" style={{ background: d.color }} />
                    {d.label}
                  </span>
                ))}
              </div>
            )}
            {i === 1 && (
              <div className="mt-1.5 flex flex-col gap-2">
                <div className="flex gap-2">
                  {ranks.map((r) => (
                    <RankBadge
                      key={r.key}
                      rank={r}
                      size={26}
                      pip={false}
                      effects={false}
                      dim={r.earnedOnly}
                    />
                  ))}
                </div>
                <span className="font-mono text-[13px] leading-[1.45] text-dim">
                  {R.placementNote}
                </span>
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
      className="reveal relative flex flex-col gap-2 rounded-2xl border p-4 pb-1.5 lg:p-6 lg:pb-3"
      style={{ borderColor: `${track.color}80`, background: `${track.color}10` }}
    >
      <span
        className="font-mono inline-flex h-6 w-fit items-center rounded-full border px-2.25 text-xs font-bold whitespace-nowrap"
        style={{ borderColor: `${track.color}80`, color: track.color }}
      >
        {track.range}
      </span>
      <h3 className="font-display m-0 mt-0.5 text-2xl leading-none font-extrabold tracking-[-0.01em] lg:text-[30px]">
        {track.name}
      </h3>
      <p className="m-0 text-[15px] leading-[1.5] text-muted lg:text-base">{track.body}</p>
      <ArrowLink href="#join" color={track.color}>
        {track.cta}
      </ArrowLink>
    </div>
  );
}

function RankRow({ rank, size }: { rank: (typeof ranks)[number]; size: number }) {
  const s = SKIN[rank.key];
  return (
    <div className="reveal flex items-start gap-4">
      <div className="flex w-19.5 shrink-0 justify-center">
        <RankBadge rank={rank} size={size} />
      </div>
      <div className="flex min-w-0 flex-col items-start gap-1.5 pt-1">
        <span
          className="font-mono text-xs font-bold tracking-[0.12em] uppercase"
          style={{ color: s.label }}
        >
          Level {rank.level}
        </span>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
          <h3 className="font-display m-0 text-[30px] leading-none font-extrabold tracking-[-0.01em]">
            {rank.name}
          </h3>
          {rank.earnedOnly && (
            <span
              className="font-mono inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-bold tracking-[0.06em] uppercase"
              style={{ borderColor: 'rgba(246,196,83,0.5)', color: '#F6C453' }}
            >
              <Icon name="lock" size={12} stroke={2.2} />
              Earned only
            </span>
          )}
        </div>
        {rank.topics.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-2">
            {rank.topics.map((t) => (
              <Chip key={t}>{t}</Chip>
            ))}
          </div>
        ) : (
          <p className="m-0 mt-0.5 text-[15px] leading-[1.5] text-muted">{rank.note}</p>
        )}
        {rank.tag && (
          <p
            className="m-0 mt-0.5 text-[15px] leading-[1.4] font-semibold"
            style={{ color: s.label }}
          >
            &ldquo;{rank.tag}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}

function ExampleMember() {
  const cur = ranks[R.example.atLevel - 1];
  const next = ranks[R.example.nextLevel - 1];
  return (
    <div className="card-d reveal flex flex-col gap-3.5 rounded-[20px] p-4.5 lg:p-6">
      <div className="flex items-center gap-4">
        <RankBadge rank={cur} size={56} bg={CARD} />
        <div className="flex min-w-0 flex-grow flex-col gap-1">
          <span className="font-mono text-xs tracking-[0.1em] uppercase text-dim">
            {R.example.label}
          </span>
          <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className="font-display text-[28px] leading-none font-extrabold tracking-[-0.01em] lg:text-[32px]">
              {cur.name}
            </span>
            <span
              className="font-mono text-[12.5px] font-bold tracking-[0.1em] uppercase"
              style={{ color: SKIN[cur.key].label }}
            >
              Level {cur.level}
            </span>
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-2">
          <RankBadge rank={next} size={40} dim pip={false} effects={false} bg={CARD} />
          <span className="font-mono text-xs tracking-[0.08em] uppercase text-dim">Next</span>
        </div>
      </div>
      <div
        role="progressbar"
        aria-label={`${R.example.solved} of ${R.example.target} problems solved to reach ${next.name}`}
        aria-valuemin={0}
        aria-valuemax={R.example.target}
        aria-valuenow={R.example.solved}
        className="grid gap-1.25"
        style={{ gridTemplateColumns: `repeat(${R.example.target}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: R.example.target }, (_, i) => (
          <span
            key={i}
            className="h-2.5 rounded-full"
            style={{
              background:
                i < R.example.solved ? SKIN[cur.key].pip : 'rgba(255,255,255,0.08)',
            }}
          />
        ))}
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
    <div className="card-d reveal flex flex-col gap-3 rounded-[20px] p-4.5 lg:p-6">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs tracking-[0.1em] uppercase text-dim">
          {R.leaderboard.title}
        </span>
        <span className="font-mono text-xs tracking-[0.1em] uppercase text-dim">
          {R.leaderboard.column}
        </span>
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {R.leaderboard.rows.map((row) => {
          const rank = ranks.find((r) => r.name === row.rank)!;
          return (
            <li
              key={row.handle}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                row.you ? 'bg-crimson/16' : 'bg-white/4'
              }`}
            >
              <RankBadge rank={rank} size={30} pip={false} effects={false} bg={row.you ? '#351121' : '#1B1C22'} />
              <span className="flex min-w-0 flex-grow flex-col">
                <span
                  className={`font-mono truncate text-sm lg:text-[15px] ${
                    row.you ? 'font-bold text-white' : 'text-[#E7E5E1]'
                  }`}
                >
                  {row.handle}
                </span>
                <span
                  className="font-mono text-xs uppercase"
                  style={{ color: SKIN[rank.key].label }}
                >
                  {row.rank}
                </span>
              </span>
              <span className="font-display shrink-0 text-base font-bold lg:text-[17px]">
                {row.solved}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="m-0 text-[15px] leading-[1.5] text-muted lg:text-base">
        {R.leaderboard.caption}
      </p>
    </div>
  );
}

export function Ranks() {
  return (
    <section
      id="ranks"
      aria-labelledby="ranks-title"
      className="relative flex flex-col overflow-clip bg-ink-deep px-5 py-19 lg:px-30 lg:pt-28 lg:pb-22"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <span
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.13) 38%, rgba(228,0,43,0.5) 62%, rgba(255,255,255,0) 100%)',
          }}
        />
        <span
          className="absolute top-[58%] left-1/2 h-155 w-130 -translate-x-[38%] rounded-full blur-[8px]"
          style={{
            background:
              'radial-gradient(closest-side, rgba(228,0,43,0.18), rgba(247,181,42,0.06) 55%, rgba(247,181,42,0) 78%)',
          }}
        />
      </div>

      <div className="relative mx-auto w-full max-w-[1200px]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
          <div className="reveal flex flex-col gap-3">
            <Eyebrow>{R.eyebrow}</Eyebrow>
            <H2 id="ranks-title">{R.title}</H2>
          </div>
          <p className="m-0 max-w-[470px] text-[17px] leading-[1.55] text-pretty text-muted lg:mb-2">
            {R.intro}{' '}
            <strong className="font-semibold whitespace-nowrap text-text">{R.introStrong}</strong>
          </p>
        </div>

        <Steps />

        {/* the climb */}
        <div className="relative mt-11 lg:mt-19">
          <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
            {R.tracks.map((t) => (
              <TrackCard key={t.key} track={t} />
            ))}
          </div>

          <ol
            aria-label="The five ranks"
            className="relative m-0 mt-8 flex list-none flex-col gap-5.5 p-0 lg:mt-14 lg:grid lg:grid-cols-5 lg:gap-5"
          >
            {/* the path itself */}
            <span
              aria-hidden="true"
              className="absolute top-1.5 bottom-11 left-[39px] -ml-px w-0.75 rounded-sm opacity-60 lg:top-[52px] lg:right-[10%] lg:bottom-auto lg:left-[10%] lg:ml-0 lg:h-0.75 lg:w-auto"
              style={{
                background:
                  'linear-gradient(var(--dir, 180deg), #6E6861 0%, #D98A4A 28%, #C3CAD6 52%, #F4C340 76%, #FF2A4E 100%)',
              }}
            />
            {ranks.map((r, i) => (
              <li key={r.key} className="contents lg:block">
                <div className="reveal hidden lg:flex lg:flex-col lg:items-center lg:gap-3 lg:text-center">
                  <span className="flex h-26 items-center justify-center">
                  <RankBadge rank={r} size={[70, 76, 82, 88, 96][i]} bg="#08090C" />
                  </span>
                  <span
                    className="font-mono text-xs font-bold tracking-[0.12em] uppercase"
                    style={{ color: SKIN[r.key].label }}
                  >
                    Level {r.level}
                  </span>
                  <h3 className="font-display m-0 text-[28px] leading-none font-extrabold tracking-[-0.01em]">
                    {r.name}
                  </h3>
                  {r.earnedOnly ? (
                    <>
                      <span
                        className="font-mono inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-bold tracking-[0.06em] uppercase"
                        style={{ borderColor: 'rgba(246,196,83,0.5)', color: '#F6C453' }}
                      >
                        <Icon name="lock" size={12} stroke={2.2} />
                        Earned only
                      </span>
                      <p className="m-0 text-[15px] leading-[1.45] text-muted">{r.note}</p>
                    </>
                  ) : (
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {r.topics.map((t) => (
                        <Chip key={t}>{t}</Chip>
                      ))}
                    </div>
                  )}
                  {r.tag && (
                    <p
                      className="m-0 text-[15px] leading-[1.4] font-semibold"
                      style={{ color: SKIN[r.key].label }}
                    >
                      &ldquo;{r.tag}&rdquo;
                    </p>
                  )}
                </div>
                <div className="lg:hidden">
                  <RankRow rank={r} size={[56, 60, 64, 70, 78][i]} />
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-8 grid items-start gap-3 lg:mt-13 lg:grid-cols-2 lg:gap-5">
            <ExampleMember />
            <ClubBoard />
          </div>

          <div className="reveal mt-7 flex items-start gap-4 lg:mt-11 lg:max-w-[900px]">
            <RankBadge rank={ranks[0]} size={44} bg="#08090C" />
            <p className="font-display m-0 pt-0.5 text-[21px] leading-[1.25] font-bold tracking-[-0.01em] lg:text-2xl">
              {R.reassurance.before}
              <span style={{ color: SKIN.guardian.label }}>{R.reassurance.rank}</span>
              {R.reassurance.after}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
