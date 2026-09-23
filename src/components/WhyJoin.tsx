import { why } from '@/lib/content';
import { Icon } from './icons';
import { Eyebrow, H2 } from './ui';
import { Ticker } from './Ticker';

export function WhyJoin() {
  return (
    <section
      id="why"
      aria-labelledby="why-title"
      className="relative z-1 flex flex-col bg-paper px-5 pt-33 pb-19 text-ink-text lg:px-30 lg:pt-24 lg:pb-34"
    >
      <div className="mx-auto w-full max-w-[1200px]">
        <Ticker />
        <div className="reveal mt-13 flex flex-col gap-3 lg:mt-20">
          <Eyebrow dark={false}>{why.eyebrow}</Eyebrow>
          <H2 id="why-title">{why.title}</H2>
        </div>
        <div className="mt-7 grid gap-3 lg:mt-14 lg:grid-cols-4 lg:gap-5">
          {why.cards.map((c) => (
            <article
              key={c.title}
              className="card-l reveal lift flex items-start gap-4 rounded-[18px] p-5 pb-5.5 lg:flex-col lg:gap-5 lg:rounded-[22px] lg:p-7 lg:pb-8"
            >
              <span
                aria-hidden="true"
                className="gloss flex size-11.5 shrink-0 items-center justify-center rounded-[14px] lg:size-13 lg:rounded-[16px]"
              >
                <Icon name={c.icon} size={22} stroke={1.9} />
              </span>
              <div className="flex flex-col gap-1.5">
                <h3 className="font-display m-0 text-[19px] leading-[1.2] font-bold tracking-[-0.015em] lg:text-[22px]">
                  {c.title}
                </h3>
                <p className="m-0 text-base leading-[1.5] text-ink-muted lg:text-[17px]">{c.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
