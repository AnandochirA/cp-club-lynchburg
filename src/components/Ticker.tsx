import { LADDER, TIERS } from '@/lib/hexgrid';

/**
 * The scoreboard band under the hero. Real problem titles from the ladder, each
 * with an "AC" verdict chip and its tier colour. Decorative and aria-hidden:
 * the ladder itself is described properly further down the page.
 */
const ITEMS = LADDER.filter((_, k) => k % 7 === 2);

export function Ticker() {
  const run = (key: string) => (
    <div key={key} aria-hidden="true" className="flex shrink-0 items-center">
      {ITEMS.map((p) => (
        <span key={p.slug} className="flex items-center gap-3 pr-10">
          <span className="verdict on-ink h-[1.35rem] px-2 text-[10.5px]" data-v="ac">
            AC
          </span>
          <span className="font-display caps text-[22px] leading-none font-bold tracking-[0.02em] whitespace-nowrap text-white/90 lg:text-[26px]">
            {p.title}
          </span>
          <span
            className="size-2.5 shrink-0 rotate-45"
            style={{ background: TIERS[p.tier].color }}
          />
        </span>
      ))}
    </div>
  );
  return (
    <div
      className="band relative z-1 overflow-hidden bg-[#0B0C10] py-4 lg:py-5"
      style={{
        maskImage: 'linear-gradient(90deg, transparent, #000 5%, #000 95%, transparent)',
        WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 5%, #000 95%, transparent)',
      }}
    >
      <div className="band-track">
        {run('a')}
        {run('b')}
      </div>
    </div>
  );
}
