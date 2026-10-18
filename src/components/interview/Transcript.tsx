'use client';

import { useEffect, useRef } from 'react';
import { interviewCopy as C, stageById } from '@/lib/interview-kit';
import { clock, type Line } from '@/lib/interview-logic';

/**
 * What was said, coach and you, in order. While live it follows the newest
 * line (unless you have scrolled up to read) and shows the words still being
 * recognised in grey.
 */
export function Transcript({
  lines,
  interim = '',
  full = false,
  live = false,
  focus = null,
}: {
  lines: Line[];
  interim?: string;
  full?: boolean;
  live?: boolean;
  /** A line to scroll to and light up (from the game film). */
  focus?: number | null;
}) {
  const box = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);

  useEffect(() => {
    const el = box.current;
    if (el && live && pinned.current) el.scrollTop = el.scrollHeight;
  }, [lines.length, interim, live]);

  useEffect(() => {
    if (focus === null) return;
    box.current?.querySelector(`[data-i="${focus}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [focus]);

  if (lines.length === 0 && !interim) {
    return <p className="m-0 text-[14.5px] leading-[1.5] text-muted">{C.transcriptEmpty}</p>;
  }

  let lastStage = '';
  return (
    <div
      ref={box}
      className="iv-transcript"
      data-live={live ? '1' : undefined}
      onScroll={(e) => {
        const el = e.currentTarget;
        pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
      }}
    >
      {lines.map((l, i) => {
        const header = l.stage !== lastStage;
        lastStage = l.stage;
        return (
          <div key={i} data-i={i} data-focus={focus === i ? '1' : undefined}>
            {header && <p className="iv-tr-stage font-mono">{stageById(l.stage).title}</p>}
            <p className="iv-tr-line" data-who={l.who}>
              <span className="font-mono iv-tr-at">{clock(l.at)}</span>
              <span>{l.text}</span>
            </p>
          </div>
        );
      })}
      {interim && (
        <p className="iv-tr-line" data-who="interim">
          <span className="font-mono iv-tr-at">…</span>
          <span>{interim}</span>
        </p>
      )}
      {full && <p className="m-0 pt-2 text-[13px] text-gold">{C.transcriptFull}</p>}
    </div>
  );
}
