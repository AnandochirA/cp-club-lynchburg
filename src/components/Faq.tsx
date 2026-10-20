'use client';

import { useState } from 'react';
import { faq, faqSection as F } from '@/lib/content';
import { Icon } from './icons';
import { Eyebrow, H2 } from './ui';

export function Faq() {
  /** One answer open at a time. */
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="relative flex flex-col bg-ink px-5 py-19 text-text lg:px-30 lg:py-32"
    >
      <div className="mx-auto grid grid-cols-[minmax(0,1fr)] w-full max-w-[1200px] gap-8 lg:grid-cols-12 lg:gap-x-10">
        <div className="flex flex-col items-start gap-3 lg:sticky lg:top-32 lg:col-span-5 lg:self-start">
          <Eyebrow>{F.eyebrow}</Eyebrow>
          <H2 id="faq-title">{F.title}</H2>
          <p className="font-mono m-0 mt-2 text-[12.5px] tracking-[0.06em] text-dim">
            {faq.length} answers
          </p>
        </div>

        <div data-stagger className="lg:col-span-7">
          {faq.map(([q, a], i) => {
            const isOpen = open === i;
            return (
              <div
                key={q}
                // The open state is a data attribute, not a class: re-rendering the className would
                // wipe the `is-in` class the reveal observer added, and the row would vanish.
                data-open={isOpen ? '' : undefined}
                className="reveal border-t border-white/12 transition-colors duration-300 last:border-b data-[open]:bg-white/[0.035]"
              >
                <h3 className="m-0">
                  <button
                    type="button"
                    id={`faq-q${i}`}
                    aria-expanded={isOpen}
                    aria-controls={`faq-a${i}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="group flex min-h-16 w-full cursor-pointer items-center justify-between gap-5 border-0 bg-transparent px-1 py-5 text-left text-text lg:min-h-[76px] lg:px-4 lg:py-6"
                  >
                    <span
                      className={`text-[18px] leading-[1.3] font-semibold transition-colors duration-300 lg:text-[22px] ${
                        isOpen ? 'text-white' : 'text-soft group-hover:text-white'
                      }`}
                    >
                      {q}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`hex-tile flex size-10 shrink-0 items-center justify-center transition-colors duration-300 ${
                        isOpen ? 'bg-crimson text-white' : 'bg-white/10 text-white/80 group-hover:bg-white/20'
                      }`}
                    >
                      <Icon
                        name="plus"
                        size={16}
                        stroke={2.4}
                        className={`transition-transform duration-500 ease-[var(--ease-out-expo)] ${isOpen ? 'rotate-45' : ''}`}
                      />
                    </span>
                  </button>
                </h3>
                <div id={`faq-a${i}`} role="region" aria-labelledby={`faq-q${i}`} inert={!isOpen} className={`faq-panel ${isOpen ? 'open' : ''}`}>
                  <div>
                    <p className="m-0 max-w-[620px] px-1 pb-6 text-base leading-[1.6] text-muted lg:px-4 lg:pb-7 lg:text-[17px]">
                      {a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
