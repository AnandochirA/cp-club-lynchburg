import { icpc as I } from '@/lib/content';
import { Balloon, Icon } from './icons';
import { Eyebrow, H2 } from './ui';

const BALLOONS = [
  { color: '#FF5C77', tilt: -8, delay: '0s' },
  { color: '#F6C453', tilt: 4, delay: '0.7s' },
  { color: '#CDD4E0', tilt: -3, delay: '1.4s' },
];

function Balloons({ sizes, gap }: { sizes: number[]; gap: number }) {
  return (
    <div aria-hidden="true" className="flex shrink-0 items-end" style={{ gap }}>
      {BALLOONS.map((b, i) => (
        <span
          key={i}
          className="anim-float block"
          style={{ animationDelay: b.delay, rotate: `${b.tilt}deg` }}
        >
          <Balloon color={b.color} width={sizes[i]} />
        </span>
      ))}
    </div>
  );
}

function Seat({ name }: { name: string | null }) {
  if (name) {
    return (
      <li className="flex items-center gap-3.5 text-[15.5px] text-soft lg:gap-4 lg:text-[17px]">
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-dim shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] lg:size-10"
          style={{ background: 'linear-gradient(160deg, #3C3D49 0%, #23242C 100%)' }}
        >
          <Icon name="person" size={19} stroke={1.9} />
        </span>
        {name}
      </li>
    );
  }
  return (
    <li className="flex items-center gap-3.5 text-[15.5px] font-semibold text-text lg:gap-4 lg:text-[17px]">
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed text-crimson-hi lg:size-10"
        style={{ borderColor: 'rgba(255,92,119,0.65)' }}
      >
        <Icon name="plus" size={18} stroke={2.2} />
      </span>
      Open seat
    </li>
  );
}

function TeamCard({ team }: { team: (typeof I.teams)[number] }) {
  const taken = team.seats.filter(Boolean).length;
  return (
    <article className="card-d reveal flex flex-col gap-3.5 rounded-[20px] p-4.5 lg:gap-4 lg:rounded-[22px] lg:px-6.5 lg:py-6">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-display m-0 text-xl leading-[1.15] font-bold tracking-[-0.01em] lg:text-[23px]">
          {team.name}
        </h4>
        <span className="font-mono flex h-6 shrink-0 items-center rounded-full bg-white/6 px-2.5 text-xs font-bold tracking-[0.04em] text-muted">
          {taken} of {team.seats.length}
        </span>
      </div>
      <ul
        aria-label={`Roster for ${team.name}`}
        className="m-0 flex list-none flex-col gap-3 p-0 lg:gap-3.5"
      >
        {team.seats.map((s, i) => (
          <Seat key={i} name={s} />
        ))}
      </ul>
    </article>
  );
}

function Reassure() {
  return (
    <div className="reveal relative flex flex-col gap-1.75 rounded-[18px] border border-white/8 bg-white/3.5 p-4.5 pb-5 lg:px-5.5 lg:py-5">
      <span className="font-mono text-xs font-bold tracking-[0.06em] uppercase text-crimson-hi lg:text-[12.5px]">
        {I.reassureLabel}
      </span>
      <p className="m-0 text-base leading-[1.55] text-muted lg:text-[16.5px]">{I.reassureBody}</p>
    </div>
  );
}

function Cta() {
  return (
    <div className="reveal flex flex-col gap-2.5 sm:flex-row sm:gap-3">
      <a
        href="#join"
        className="btn btn-primary flex h-13 items-center justify-center gap-2.5 rounded-[14px] px-6 text-base font-semibold text-white no-underline hover:text-white"
      >
        <span className="sheen" aria-hidden="true" />
        {I.primaryCta}
      </a>
      <a
        href="#discord"
        className="btn btn-ghost flex h-13 items-center justify-center gap-2.5 rounded-[14px] px-5.5 text-base font-semibold no-underline"
        style={{ color: 'var(--color-text)' }}
      >
        <Icon name="chat" size={17} stroke={2} />
        {I.secondaryCta}
      </a>
    </div>
  );
}

export function Icpc() {
  return (
    <section
      id="icpc"
      aria-labelledby="icpc-title"
      className="relative flex flex-col overflow-clip bg-ink-icpc px-5 py-19 lg:px-30 lg:pt-28 lg:pb-30"
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
          className="absolute inset-0"
          style={{
            backgroundImage:
              'repeating-linear-gradient(115deg, rgba(255,255,255,0.032) 0 1px, transparent 1px 13px)',
            maskImage: 'radial-gradient(120% 70% at 50% 34%, #000 18%, transparent 78%)',
            WebkitMaskImage: 'radial-gradient(120% 70% at 50% 34%, #000 18%, transparent 78%)',
          }}
        />
        <span
          className="absolute top-[-6%] left-[-20%] h-175 w-225 rounded-full blur-[10px]"
          style={{
            background:
              'radial-gradient(closest-side, rgba(228,0,43,0.3), rgba(246,196,83,0.07) 56%, rgba(246,196,83,0) 80%)',
          }}
        />
      </div>

      <div className="relative mx-auto w-full max-w-[1200px]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
          <div className="reveal flex flex-col gap-3">
            <Eyebrow>{I.eyebrow}</Eyebrow>
            <H2 id="icpc-title">{I.title}</H2>
          </div>
          <p className="m-0 max-w-[520px] text-[17px] leading-[1.55] text-pretty text-muted lg:mb-1 lg:text-lg">
            {I.intro.before}
            <strong className="font-semibold text-text">{I.intro.strong}</strong>
            {I.intro.after}
          </p>
        </div>

        <div className="mt-7 grid items-start gap-5 lg:mt-14 lg:grid-cols-12">
          {/* the date + the format */}
          <article className="card-d reveal flex flex-col gap-5 rounded-[22px] p-5 py-5.5 lg:col-span-7 lg:gap-6.5 lg:rounded-[26px] lg:p-9">
            <div className="flex items-start justify-between gap-3 lg:gap-5">
              <div className="flex min-w-0 flex-col gap-2.5 lg:gap-3">
                <span className="font-mono text-xs tracking-[0.1em] uppercase text-gold lg:text-[13px]">
                  <span className="lg:hidden">{I.labelShort}</span>
                  <span className="hidden lg:inline">{I.label}</span>
                </span>
                <p className="font-display m-0 text-[clamp(2.4rem,8vw,3.9rem)] leading-[0.97] font-extrabold tracking-[-0.022em]">
                  {I.date}
                  <span className="text-crimson">.</span>
                </p>
                <span className="font-mono text-[13px] text-muted lg:text-sm">{I.meta}</span>
              </div>
              <Balloons sizes={[26, 32, 22]} gap={6} />
            </div>

            <span
              aria-hidden="true"
              className="h-px"
              style={{
                background: 'linear-gradient(90deg, rgba(255,255,255,0.14), rgba(255,255,255,0))',
              }}
            />

            <div className="grid grid-cols-2 gap-x-4 gap-y-4.5 lg:grid-cols-4 lg:gap-4">
              {I.stats.map((s) => (
                <div key={s.label} className="flex min-w-0 flex-col gap-1.25">
                  <span className="font-display text-[34px] leading-none font-extrabold tracking-[-0.02em] text-gold lg:text-[46px]">
                    {s.value}
                  </span>
                  <span className="font-mono text-xs leading-[1.35] text-muted lg:text-[13px]">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>

            <p className="m-0 max-w-[560px] text-[14.5px] leading-[1.5] text-dim lg:text-[15.5px]">
              {I.penalty}
            </p>

            <div className="hidden lg:block">
              <Reassure />
            </div>
          </article>

          {/* the seats */}
          <div className="flex flex-col gap-3 lg:col-span-5 lg:gap-4">
            <div className="reveal flex flex-col gap-2">
              <h3 className="font-display m-0 text-[28px] leading-[1.04] font-extrabold tracking-[-0.014em] lg:text-[34px]">
                {I.rosterTitle}
                <span className="text-crimson">.</span>
              </h3>
              <p className="m-0 text-base leading-[1.5] text-muted lg:text-[16.5px]">
                {I.rosterBody}
              </p>
            </div>
            {I.teams.map((t) => (
              <TeamCard key={t.name} team={t} />
            ))}
            <div className="mt-1 lg:hidden">
              <Reassure />
            </div>
            <div className="mt-1">
              <Cta />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
