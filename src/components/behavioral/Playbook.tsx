'use client';

import { useEffect, useState } from 'react';
import { BOOK_CREDIT, CARDS, GROUPS } from '@/lib/bh/playbook';
import { QTYPES } from '@/lib/bh/questions';
import { SIGNALS } from '@/lib/bh/signals';
import { HYPO_BLOCKS, VALUE_PATTERNS } from '@/lib/bh/kit';
import { LEVELS } from '@/lib/bh/levels';
import type { Nav } from './BehavioralStudio';
import { Eyebrow, type Go, H2 } from './ui';

/** The ideas behind every check, as short cards. Doctor findings and answer checks deep-link here. */
export function Playbook({ nav }: { go: (g: Go) => void; nav: Nav }) {
  const [hi, setHi] = useState<string | null>(null);
  useEffect(() => {
    if (!nav.concept) return;
    setHi(nav.concept);
    const t = setTimeout(() => document.getElementById(`pb-${nav.concept}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    return () => clearTimeout(t);
  }, [nav.key, nav.concept]);

  return (
    <>
      <section className="panel bh-hero flex flex-col gap-3 p-5 lg:p-8" aria-labelledby="pb-title">
        <span className="eyebrow-m">Reference</span>
        <h1 id="pb-title" className="bh-title font-display caps m-0" style={{ fontSize: 'clamp(54px, 9vw, 104px)' }}>
          Playbook
        </h1>
        <p className="m-0 max-w-[64ch] text-[15.5px] leading-[1.55] text-soft">Every rule the Story Doctor and the answer checks use, and why it matters to the person across the table.</p>
        <nav className="flex flex-wrap gap-2 pt-1" aria-label="Playbook sections">
          {GROUPS.map((g) => (
            <a key={g} href={`#pbg-${g}`} className="iv-chip-btn inline-flex items-center no-underline">
              {g}
            </a>
          ))}
        </nav>
      </section>

      {GROUPS.map((g) => (
        <section key={g} id={`pbg-${g}`} className="flex flex-col gap-3" aria-labelledby={`pbh-${g}`}>
          <H2 id={`pbh-${g}`}>{g}</H2>
          <div className="bh-pb">
            {CARDS.filter((c) => c.group === g).map((c) => (
              <article key={c.key} id={`pb-${c.key}`} className="bh-pb-card" data-hi={hi === c.key ? '1' : undefined}>
                <h3 className="m-0 text-[19px] leading-[1.25] font-semibold text-text">{c.title}</h3>
                <p className="m-0 text-[15px] leading-[1.5] text-[var(--tier)]">{c.gist}</p>
                <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-[14.5px] leading-[1.5] text-soft">
                  {c.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
                {c.pair && (
                  <div className="bh-pair">
                    <p data-k="bad">{c.pair.bad}</p>
                    <p data-k="good">{c.pair.good}</p>
                  </div>
                )}
                {c.key === 'signals' && (
                  <dl className="bh-defs m-0">
                    {SIGNALS.map((a) => (
                      <div key={a.key}>
                        <dt className="font-mono">{a.title}</dt>
                        <dd>{a.definition}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {c.key === 'qtypes' && (
                  <dl className="bh-defs m-0">
                    {QTYPES.map((q) => (
                      <div key={q.key}>
                        <dt className="font-mono">{q.title}</dt>
                        <dd>{q.shape}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {c.key === 'values' && (
                  <dl className="bh-defs m-0">
                    {VALUE_PATTERNS.map((v) => (
                      <div key={v.topic}>
                        <dt className="font-mono">{v.topic}</dt>
                        <dd>{v.axis}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {c.key === 'hypo' && (
                  <dl className="bh-defs m-0">
                    {HYPO_BLOCKS.map((h) => (
                      <div key={h.kind}>
                        <dt className="font-mono">{h.kind}</dt>
                        <dd>{h.blocks.join(' · ')}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {c.key === 'levels' && (
                  <dl className="bh-defs m-0">
                    {LEVELS.map((l) => (
                      <div key={l.key}>
                        <dt className="font-mono">{l.key}</dt>
                        <dd>{l.works}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}
      <p className="m-0 font-mono text-[11.5px] text-dim">
        <Eyebrow>{BOOK_CREDIT}</Eyebrow>
      </p>
    </>
  );
}
