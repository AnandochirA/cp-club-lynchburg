import { how as H } from '@/lib/content';
import { Eyebrow, H2 } from '../ui';

/** Four steps that really are a sequence, so they are numbered and joined by a rule. */
export function How() {
  return (
    <section id="how" aria-labelledby="how-title" className="relative flex flex-col overflow-hidden bg-ink px-5 py-19 text-text lg:px-30 lg:py-32">
      <div aria-hidden="true" className="hex-bg-ink pointer-events-none absolute inset-0 opacity-60 [mask-image:linear-gradient(180deg,#000,transparent_80%)]" />
      <div className="relative mx-auto flex w-full max-w-[1200px] flex-col">
        <div className="flex flex-col gap-3">
          <Eyebrow>{H.eyebrow}</Eyebrow>
          <H2 id="how-title">{H.title}</H2>
        </div>
        <ol data-stagger className="reveal hw-steps m-0 mt-12 grid list-none grid-cols-[minmax(0,1fr)] gap-0 p-0 lg:mt-18 lg:grid-cols-4">
          {H.steps.map((s, i) => (
            <li key={s.title} className="reveal hw-step">
              <span className="hw-num font-display" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="hw-dot" aria-hidden="true" />
              <h3 className="font-display caps m-0 text-[32px] leading-[0.95] font-extrabold lg:text-[36px]">{s.title}</h3>
              <p className="m-0 text-[15.5px] leading-[1.55] text-muted">{s.body}</p>
              <span className="font-mono mt-auto pt-2 text-[12px] tracking-[0.06em] text-dim uppercase">{s.meta}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
