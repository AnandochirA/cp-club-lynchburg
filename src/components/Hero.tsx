import { hero } from '@/lib/content';
import { Icon } from './icons';

/* The snippet that types itself out in the editor. Colours match the
   syntax theme used across the site. */
const C = {
  comment: '#6B7280',
  kw: '#FF7A90',
  fn: '#8DB7FF',
  punct: '#A7A8AA',
  str: '#7FD8A8',
  num: '#F6C453',
};

type Tok = [string, string | null];
const CODE: [number, Tok[]][] = [
  [0, [['# Two Sum, an interview classic', C.comment]]],
  [
    0,
    [
      ['def ', C.kw],
      ['two_sum', C.fn],
      ['(', C.punct],
      ['nums', null],
      [', ', C.punct],
      ['target', null],
      ['):', C.punct],
    ],
  ],
  [
    1,
    [
      ['seen', null],
      [' = ', C.punct],
      ['{}', C.punct],
    ],
  ],
  [
    1,
    [
      ['for ', C.kw],
      ['i', null],
      [', ', C.punct],
      ['x', null],
      [' in ', C.kw],
      ['enumerate', C.fn],
      ['(', C.punct],
      ['nums', null],
      ['):', C.punct],
    ],
  ],
  [
    2,
    [
      ['need', null],
      [' = ', C.punct],
      ['target', null],
      [' - ', C.punct],
      ['x', null],
    ],
  ],
  [
    2,
    [
      ['if ', C.kw],
      ['need', null],
      [' in ', C.kw],
      ['seen', null],
      [':', C.punct],
    ],
  ],
  [
    3,
    [
      ['return ', C.kw],
      ['[', C.punct],
      ['seen', null],
      ['[', C.punct],
      ['need', null],
      ['], ', C.punct],
      ['i', null],
      [']', C.punct],
    ],
  ],
  [
    2,
    [
      ['seen', null],
      ['[', C.punct],
      ['x', null],
      ['] = ', C.punct],
      ['i', null],
    ],
  ],
];

function CodeBlock() {
  return (
    <div className="font-mono flex flex-col py-3.5 pr-4 pb-4 pl-2.5 text-[12.5px] leading-[21px] lg:text-[13.5px] lg:leading-[23px]">
      {CODE.map(([indent, toks], i) => (
        <span key={i} className="flex">
          <span
            aria-hidden="true"
            className="mr-3.5 w-4 shrink-0 text-right text-dim/70 select-none"
          >
            {i + 1}
          </span>
          <span
            className="anim-type min-w-0"
            style={{ animationDelay: `${0.95 + i * 0.16}s`, paddingLeft: indent * 18 }}
          >
            {toks.map(([t, color], j) => (
              <span key={j} style={color ? { color } : undefined}>
                {t}
              </span>
            ))}
          </span>
        </span>
      ))}
    </div>
  );
}

export function Hero() {
  return (
    <section
      id="hero"
      aria-labelledby="hero-title"
      className="relative z-2 -mt-[70px] flex flex-col bg-ink px-5 pt-27 lg:-mt-20 lg:px-30 lg:pt-46"
    >
      {/* grid + glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
            backgroundPosition: '4px 0',
            maskImage: 'radial-gradient(130% 40% at 50% 0%, #000 25%, transparent 78%)',
            WebkitMaskImage: 'radial-gradient(130% 40% at 50% 0%, #000 25%, transparent 78%)',
          }}
        />
        <div
          className="anim-glow absolute top-[-190px] left-1/2 h-95 w-140 -translate-x-1/2 rounded-full blur-[10px]"
          style={{
            background: 'radial-gradient(closest-side, rgba(228,0,43,0.18), rgba(228,0,43,0))',
          }}
        />
      </div>

      <div className="relative mx-auto flex w-full max-w-[1200px] flex-col items-start gap-5.5 lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-10">
        <div className="flex flex-col items-start gap-5.5 lg:col-span-7">
          <a
            href={hero.pill.href}
            className="anim-drop link-arrow flex h-9 items-center gap-2.5 rounded-full border border-white/10 bg-[rgba(22,23,29,0.75)] py-0 pr-3 pl-1 text-[13.5px] font-medium text-soft no-underline hover:text-soft lg:h-10 lg:gap-3 lg:pr-4 lg:pl-1.25 lg:text-[15px]"
            style={{ animationDelay: '0.15s' }}
          >
            <span className="font-mono flex h-6.5 items-center rounded-full bg-crimson px-2.25 text-xs font-bold tracking-[0.02em] text-white lg:h-7.5 lg:px-3 lg:text-[12.5px]">
              {hero.pill.tag}
            </span>
            {hero.pill.text}
            <Icon name="arrow" size={14} stroke={2.4} className="arrow" />
          </a>

          <h1
            id="hero-title"
            className="font-display m-0 text-[clamp(2.5rem,8vw,2.9rem)] leading-[1.02] font-extrabold tracking-[-0.018em] lg:text-[clamp(3rem,3.8vw,3.6rem)]"
          >
            <span className="-mb-[0.12em] block overflow-hidden pb-[0.12em]">
              <span
                className="anim-mask bg-clip-text text-transparent"
                style={{
                  animationDelay: '0.25s',
                  backgroundImage: 'linear-gradient(180deg, #FFFFFF 35%, #C4C0BB 100%)',
                }}
              >
                Get <span className="whitespace-nowrap">interview-ready.</span>
              </span>
            </span>
            <span className="-mb-[0.12em] block overflow-hidden pb-[0.12em]">
              <span
                className="anim-mask bg-clip-text text-transparent"
                style={{
                  animationDelay: '0.38s',
                  backgroundImage: 'linear-gradient(180deg, #FF2A4E 30%, #D8002A 100%)',
                }}
              >
                {hero.line2}
              </span>
            </span>
          </h1>

          <p
            className="anim-rise m-0 max-w-[560px] text-[17px] leading-[1.55] text-pretty text-muted lg:text-lg"
            style={{ animationDelay: '0.5s' }}
          >
            {hero.sub}{' '}
            <strong className="font-semibold whitespace-nowrap text-text">{hero.subStrong}</strong>
          </p>

          <div
            className="anim-rise mt-1 flex w-full flex-col gap-3 self-stretch sm:flex-row"
            style={{ animationDelay: '0.62s' }}
          >
            <a
              href="#join"
              className="btn btn-primary flex h-14 items-center justify-center gap-2.5 rounded-[14px] px-6 text-[17px] font-semibold text-white no-underline hover:text-white"
            >
              <span className="sheen" aria-hidden="true" />
              {hero.primaryCta}
              <Icon name="arrow" size={18} stroke={2.2} className="arrow" />
            </a>
            <a
              href="#events"
              className="btn btn-ghost flex h-14 items-center justify-center rounded-[14px] px-6 text-[17px] font-semibold no-underline"
              style={{ color: 'var(--color-text)' }}
            >
              {hero.secondaryCta}
            </a>
          </div>
        </div>

        {/* editor */}
        <div
          className="anim-rise-lg relative mx-auto mt-11.5 mb-[-84px] w-full lg:col-span-5 lg:mt-0 lg:mb-0"
          style={{ animationDelay: '0.72s' }}
        >
          <div
            aria-hidden="true"
            className="anim-glow pointer-events-none absolute -top-12.5 right-[-10px] left-[-10px] h-60 rounded-full blur-[18px]"
            style={{
              background: 'radial-gradient(closest-side, rgba(228,0,43,0.45), rgba(228,0,43,0))',
            }}
          />
          <figure
            aria-label="A code editor typing out a short Python solution to Two Sum, a classic interview problem, which then passes all its tests."
            className="relative m-0 flex flex-col overflow-hidden rounded-[18px] border border-transparent text-[#E7E5E1] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.85),0_0_0_6px_rgba(255,255,255,0.02)]"
            style={{
              background:
                'linear-gradient(#101116, #101116) padding-box, linear-gradient(180deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05) 40%, rgba(255,255,255,0.03)) border-box',
            }}
          >
            <span
              aria-hidden="true"
              className="absolute top-0 right-[14%] left-[14%] h-px"
              style={{
                background:
                  'linear-gradient(90deg, rgba(255,92,119,0), rgba(255,92,119,0.95), rgba(255,92,119,0))',
              }}
            />
            <div className="flex h-10 items-stretch justify-between border-b border-[#25262F] bg-[#17181F]">
              <span className="font-mono flex items-center gap-2 border-r border-[#25262F] bg-[#101116] px-3.5 text-[12.5px] shadow-[inset_0_2px_0_#E4002B]">
                <span aria-hidden="true" className="size-2 rounded-sm bg-[#6FD3C1]" />
                {hero.file}
              </span>
            </div>
            <CodeBlock />
            <div className="font-mono flex flex-col border-t border-[#25262F] bg-[#0C0D11] px-4 pt-3 pb-3.5 text-[12.5px] leading-[22px]">
              <span className="anim-rise text-muted" style={{ animationDelay: '2.35s' }}>
                <span className="text-crimson-hi">$</span> {hero.terminal.cmd}
              </span>
              <span
                className="anim-rise flex items-center gap-2 text-[#52D68A]"
                style={{ animationDelay: '2.6s' }}
              >
                <Icon name="check" size={14} stroke={3} />
                <span>{hero.terminal.result}</span>
                <span className="text-dim">{hero.terminal.time}</span>
              </span>
              <span
                className="anim-rise flex items-center gap-2 text-muted"
                style={{ animationDelay: '2.8s' }}
              >
                <span className="text-crimson-hi">$</span>
                <span aria-hidden="true" className="anim-blink h-4 w-2 bg-text" />
              </span>
            </div>
          </figure>

          <div
            aria-hidden="true"
            className="anim-toast absolute -top-6.5 -right-1.5 flex items-center gap-3 rounded-2xl border border-transparent py-2.5 pr-4 pl-2.5 shadow-[0_20px_44px_-18px_rgba(0,0,0,0.85),0_0_36px_-12px_rgba(82,214,138,0.4)] backdrop-blur-[12px]"
            style={{
              background:
                'linear-gradient(rgba(24,25,32,0.94), rgba(24,25,32,0.94)) padding-box, linear-gradient(160deg, rgba(82,214,138,0.6), rgba(255,255,255,0.06) 60%) border-box',
            }}
          >
            <span className="flex size-8.5 items-center justify-center rounded-[10px] bg-[rgba(82,214,138,0.15)] text-[#52D68A]">
              <Icon name="check" size={18} stroke={3} />
            </span>
            <span className="flex flex-col gap-0.75">
              <span className="font-display text-lg leading-none font-extrabold text-text">
                {hero.toast.title}
              </span>
              <span className="font-mono text-xs text-muted">{hero.toast.sub}</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
