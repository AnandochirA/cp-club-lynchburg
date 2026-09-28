import { hero } from '@/lib/content';
import { HexField } from './motion/HexField';
import { Icon } from './icons';

/**
 * The hero is a poster: scoreboard capitals on paper, and on the right the Grid
 * of 250, the club's whole ladder as one honeycomb (see HexField). The type
 * rises out of a mask; the honeycomb prints itself from the base up.
 */
export function Hero() {
  return (
    <section
      id="hero"
      aria-labelledby="hero-title"
      className="relative z-2 -mt-[70px] flex flex-col overflow-hidden bg-paper px-5 pt-28 pb-14 text-ink-text lg:-mt-20 lg:px-14 lg:pt-40 lg:pb-20 xl:px-30"
    >
      <div className="relative mx-auto grid w-full max-w-[1280px] grid-cols-[minmax(0,1fr)] items-center gap-12 lg:grid-cols-12 lg:gap-x-10">
        <div className="flex min-w-0 flex-col items-start gap-6 lg:col-span-7">
          <a
            href={hero.pill.href}
            className="anim-drop group flex items-center gap-3 text-[14px] font-medium text-ink-text no-underline hover:text-ink-text"
            style={{ animationDelay: '0.1s' }}
          >
            <span className="font-mono flex h-7 items-center bg-crimson px-2.5 text-[11.5px] font-bold tracking-[0.08em] text-white uppercase [clip-path:polygon(0_0,calc(100%-7px)_0,100%_7px,100%_100%,0_100%)]">
              {hero.pill.tag}
            </span>
            <span className="border-b border-ink-text/30 pb-px transition-colors group-hover:border-crimson">
              {hero.pill.text}
            </span>
            <Icon name="arrow" size={14} stroke={2.4} className="arrow" />
          </a>

          <h1
            id="hero-title"
            className="font-display caps m-0 text-[clamp(2.6rem,11.8vw,4.4rem)] leading-[0.88] font-black tracking-[-0.005em] whitespace-nowrap lg:text-[clamp(4.4rem,6.2vw,6.6rem)]"
          >
            <span className="block overflow-hidden pt-[0.04em]">
              <span className="anim-mask" style={{ animationDelay: '0.2s' }}>
                Get
              </span>
            </span>
            <span className="block overflow-hidden">
              <span className="anim-mask" style={{ animationDelay: '0.3s' }}>
                Interview-ready.
              </span>
            </span>
            <span className="block overflow-hidden">
              <span className="anim-mask text-crimson" style={{ animationDelay: '0.42s' }}>
                {hero.line2}
              </span>
            </span>
          </h1>

          <p
            className="anim-rise m-0 max-w-[540px] text-[17px] leading-[1.55] text-pretty text-ink-muted lg:text-[19px]"
            style={{ animationDelay: '0.62s' }}
          >
            {hero.sub}{' '}
            <strong className="font-semibold whitespace-nowrap text-ink-text">{hero.subStrong}</strong>
          </p>

          <div
            className="anim-rise mt-1 flex w-full flex-col gap-3 self-stretch sm:flex-row"
            style={{ animationDelay: '0.74s' }}
          >
            <a
              href="#join"
              data-magnetic
              className="btn btn-primary flex h-14 items-center justify-center gap-2.5 rounded-none px-7 text-[17px] font-semibold text-white no-underline hover:text-white [clip-path:polygon(0_0,calc(100%-12px)_0,100%_12px,100%_100%,0_100%)]"
            >
              <span className="sheen" aria-hidden="true" />
              {hero.primaryCta}
              <Icon name="arrow" size={18} stroke={2.2} className="arrow" />
            </a>
            <a
              href="#events"
              className="btn-ink flex h-14 items-center justify-center px-7 text-[17px] font-semibold no-underline"
            >
              {hero.secondaryCta}
            </a>
          </div>
        </div>

        <div className="min-w-0 lg:col-span-5">
          <HexField />
        </div>
      </div>
    </section>
  );
}
