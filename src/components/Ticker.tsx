import { ticker } from '@/lib/content';

/** Endless scrolling strip of one-line reassurances. Decorative: the same
 *  claims appear as real text elsewhere on the page. */
export function Ticker() {
  const run = (key: string) => (
    <span key={key} aria-hidden="true" className="flex shrink-0 items-center">
      {ticker.map((t, i) => (
        <span key={i} className="flex items-center">
          <span className="font-mono px-3 text-[12.5px] whitespace-nowrap text-[#3A3C44] lg:text-[13px]">
            {t}
          </span>
          <span className="text-crimson">&bull;</span>
        </span>
      ))}
    </span>
  );
  return (
    <div
      className="-mx-5 overflow-hidden lg:-mx-30"
      style={{
        maskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)',
        WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)',
      }}
    >
      <div className="anim-marquee flex w-max">
        {run('a')}
        {run('b')}
      </div>
    </div>
  );
}
