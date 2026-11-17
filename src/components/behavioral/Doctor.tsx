'use client';

import { useState } from 'react';
import type { Finding } from '@/lib/bh/coach';
import { cardByKey } from '@/lib/bh/playbook';
import { Area, ConceptLink, type Go } from './ui';

const SEV = { blocker: 'Fix', warn: 'Weak spot', tip: 'Tip' } as const;

/**
 * The Story Doctor's findings for one part of a story. Blockers must be fixed;
 * weak spots and tips can instead be "defended" with a framing you prepare,
 * because sometimes the honest story has a weak spot you cannot remove.
 */
export function Doctor({
  findings,
  go,
  onDefend,
  empty = 'Nothing to fix here.',
}: {
  findings: Finding[];
  go: (g: Go) => void;
  onDefend: (id: string, framing: string | null) => void;
  empty?: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [text, setText] = useState('');
  if (findings.length === 0)
    return (
      <p className="bh-doc-clear m-0" role="status">
        ✓ {empty}
      </p>
    );
  return (
    <ul className="bh-doc m-0 list-none p-0" aria-label="Story Doctor">
      {findings.map((f) => (
        <li key={f.id} className="bh-find" data-sev={f.severity} data-ack={f.ack ? '1' : undefined}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="flex items-baseline gap-2">
              <b className="bh-find-sev font-mono">{f.ack ? 'Defended' : SEV[f.severity]}</b>
              <span className="text-[15.5px] font-semibold text-text">{f.title}</span>
            </span>
            <ConceptLink concept={f.concept} go={go}>
              {cardByKey(f.concept).title} →
            </ConceptLink>
          </div>
          {f.ack ? (
            <p className="m-0 text-[14px] leading-[1.5] text-soft">
              Your framing: <i>{f.ack}</i>{' '}
              <button type="button" className="iv-link" onClick={() => onDefend(f.id, null)}>
                Undo
              </button>
            </p>
          ) : (
            <>
              <p className="m-0 text-[14px] leading-[1.5] text-muted">{f.detail}</p>
              <p className="m-0 text-[14px] leading-[1.5] text-soft">
                <b>Fix:</b> {f.fix}
              </p>
              {f.severity !== 'blocker' &&
                (open === f.id ? (
                  <div className="flex flex-col gap-2 pt-1">
                    <Area value={text} onChange={setText} rows={2} max={450} placeholder="How you will frame it if it comes up (one or two sentences)" />
                    <div className="flex gap-3">
                      <button
                        type="button"
                        className="iv-chip-btn"
                        disabled={!text.trim()}
                        onClick={() => {
                          onDefend(f.id, text.trim());
                          setOpen(null);
                          setText('');
                        }}
                      >
                        Keep it, with this framing
                      </button>
                      <button type="button" className="iv-link" onClick={() => setOpen(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="iv-link w-fit"
                    onClick={() => {
                      setOpen(f.id);
                      setText('');
                    }}
                  >
                    Can&apos;t change it? Prepare a framing instead
                  </button>
                ))}
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
