'use client';

import { useState } from 'react';
import { faq, faqSection as F } from '@/lib/content';
import { Icon } from './icons';
import { Eyebrow, H2 } from './ui';

export function Faq() {
  /** One answer open at a time, like the design. */
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="flex flex-col bg-paper px-5 py-19 pb-14 text-ink-text lg:px-30 lg:pt-34 lg:pb-28"
    >
      <div className="mx-auto grid w-full max-w-[1200px] gap-6 lg:grid-cols-12 lg:gap-x-6">
        <div className="reveal flex flex-col items-start gap-3 lg:col-span-5">
          <Eyebrow dark={false}>{F.eyebrow}</Eyebrow>
          <H2 id="faq-title">{F.title}</H2>
        </div>

        <div className="card-l reveal overflow-hidden rounded-[20px] lg:col-span-7 lg:col-start-6 lg:rounded-[22px]">
          {faq.map(([q, a], i) => {
            const isOpen = open === i;
            return (
              <div key={q} className={i > 0 ? 'border-t border-[#EDE9E3]' : ''}>
                <h3 className="m-0">
                  <button
                    type="button"
                    id={`faq-q${i}`}
                    aria-expanded={isOpen}
                    aria-controls={`faq-a${i}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="faq-row font-display flex min-h-16 w-full cursor-pointer items-center justify-between gap-3.5 border-0 px-4 py-3.5 pl-5 text-left text-lg leading-[1.3] font-bold tracking-[-0.01em] text-ink-text lg:min-h-19.5 lg:gap-5 lg:px-5.5 lg:py-4.5 lg:pl-7.5 lg:text-[21px]"
                  >
                    {q}
                    <span
                      aria-hidden="true"
                      className={`flex size-8 shrink-0 items-center justify-center rounded-full transition-colors lg:size-9 ${
                        isOpen ? 'bg-crimson text-white' : 'bg-paper text-ink-muted'
                      }`}
                    >
                      <Icon name={isOpen ? 'minus' : 'plus'} size={16} stroke={2.4} />
                    </span>
                  </button>
                </h3>
                {isOpen && (
                  <div
                    id={`faq-a${i}`}
                    role="region"
                    aria-labelledby={`faq-q${i}`}
                    className="anim-open max-w-150 px-5 pb-5 text-base leading-[1.55] text-ink-muted lg:px-7.5 lg:pb-6.5 lg:text-[17px] lg:leading-[1.6]"
                  >
                    {a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
