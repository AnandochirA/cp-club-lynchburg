import { hero } from '@/lib/content';
import { Icon } from './icons';
import { MockRound } from './landing/MockRound';

/**
 * The hero states the site's whole argument in three words of scoreboard
 * capitals, then proves it on the right: a mock round playing itself out,
 * from "read it back to me" to the stamp. The type rises out of a mask.
 */
export function Hero() {
  const [first, middle, last] = hero.lines;
  return (
    <section
      id="hero"
      aria-labelledby="hero-title"
      className="relative z-2 -mt-[70px] flex flex-col overflow-hidden bg-paper px-5 pt-28 pb-16 text-ink-text lg:-mt-20 lg:px-14 lg:pt-40 lg:pb-24 xl:px-24"
    >
      <div aria-hidden="true" className="hex-bg-paper pointer-events-none absolute inset-0 [mask-image:radial-gradient(70%_60%_at_80%_40%,#000,transparent)]" />
      <div className="relative mx-auto grid w-full max-w-[1320px] grid-cols-[minmax(0,1fr)] items-center gap-12 lg:grid-cols-12 lg:gap-x-12">
        <div className="flex min-w-0 flex-col items-start gap-7 lg:col-span-6">
          <span className="anim-drop font-mono text-[12.5px] font-medium tracking-[0.16em] text-ink-muted uppercase" style={{ animationDelay: '0.1s' }}>
            <span className="text-crimson">{'// '}</span>
            {hero.eyebrow}
          </span>

          <h1 id="hero-title" className="hero-h font-display caps m-0 self-stretch font-black">
            <span className="block overflow-hidden pt-[0.04em]">
              <span className="anim-mask relative" style={{ animationDelay: '0.2s', display: 'inline-block' }}>
                {first}
                <span className="hero-ac font-mono" aria-hidden="true">
                  <Icon name="check" size={12} stroke={3.4} />
                  AC
                </span>
              </span>
            </span>
            <span className="block overflow-hidden">
              <span className="anim-mask text-ink-muted/80" style={{ animationDelay: '0.3s' }}>
                {middle}
              </span>
            </span>
            <span className="block overflow-hidden">
              <span className="anim-mask text-crimson" style={{ animationDelay: '0.42s' }}>
                {last}
              </span>
            </span>
          </h1>

          <p className="anim-rise m-0 max-w-[520px] text-[17px] leading-[1.55] text-pretty text-ink-muted lg:text-[19px]" style={{ animationDelay: '0.62s' }}>
            {hero.sub} <strong className="font-semibold text-ink-text">{hero.subStrong}</strong>
          </p>

          <div className="anim-rise flex w-full flex-col gap-3 sm:w-auto sm:flex-row" style={{ animationDelay: '0.74s' }}>
            <a
              href="#join"
              data-magnetic
              className="btn btn-primary flex h-14 items-center justify-center gap-2.5 rounded-none px-7 text-[17px] font-semibold text-white no-underline hover:text-white [clip-path:polygon(0_0,calc(100%-12px)_0,100%_12px,100%_100%,0_100%)]"
            >
              <span className="sheen" aria-hidden="true" />
              {hero.primaryCta}
              <Icon name="arrow" size={18} stroke={2.2} className="arrow" />
            </a>
            <a href="#room" className="btn-ink flex h-14 items-center justify-center px-7 text-[17px] font-semibold no-underline">
              {hero.secondaryCta}
            </a>
          </div>
        </div>

        <figure className="anim-rise-lg m-0 flex min-w-0 flex-col gap-3 lg:col-span-6" style={{ animationDelay: '0.5s' }}>
          <MockRound />
          <figcaption className="font-mono text-[11.5px] leading-[1.5] text-ink-muted">{hero.caption}</figcaption>
        </figure>
      </div>
    </section>
  );
}
