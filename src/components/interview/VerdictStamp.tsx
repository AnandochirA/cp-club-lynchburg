'use client';

import { VERDICTS, interviewCopy as C } from '@/lib/interview-kit';
import type { Verdict } from '@/lib/interview-logic';

/**
 * The hiring committee's rubber stamp. Pending is a dashed outline; once you
 * lock in your scores it slams down (and the panel under it takes the hit).
 */
export function VerdictStamp({ verdict, date, slam }: { verdict: Verdict | null; date: string; slam: boolean }) {
  if (!verdict) {
    return (
      <div className="iv-stamp" data-pending="1">
        <span className="iv-stamp-word font-display caps">{C.review.pending}</span>
        <span className="iv-stamp-meta font-mono">{C.review.pendingNote}</span>
      </div>
    );
  }
  const v = VERDICTS[verdict];
  return (
    <div className="iv-stamp" data-v={v.v} data-slam={slam ? '1' : undefined} role="status">
      <span className="iv-stamp-meta font-mono">Coding round · {date}</span>
      <span className="iv-stamp-word font-display caps">{v.label}</span>
      <span className="iv-stamp-meta font-mono">Self-assessed</span>
    </div>
  );
}
