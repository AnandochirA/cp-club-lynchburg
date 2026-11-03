'use client';

import { useState } from 'react';
import { apiErrors } from '@/lib/content';
import { apiPost } from '@/lib/client-api';
import { interviewCopy } from '@/lib/interview-kit';

const R = interviewCopy.reviewSolution;

/** Where your own past submissions to a problem live on LeetCode. */
export const submissionsUrl = (slug: string) => `https://leetcode.com/problems/${slug}/submissions/`;

/** "Mark reviewed": counts as passing the problem's current redo box. */
export function ReviewButton({ slug, title, onDone, className }: { slug: string; title: string; onDone: () => void; className?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function mark() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await apiPost('/api/interview/review', { slug });
    setBusy(false);
    if (!res.ok) return setError(apiErrors[res.error] ?? apiErrors.server);
    onDone();
  }

  return (
    <>
      <button type="button" onClick={mark} disabled={busy} aria-label={R.markLabel(title)} className={className}>
        {busy ? R.saving : R.done}
      </button>
      {error && (
        <span role="alert" className="font-mono text-[12px] text-[#FF8FA1]">
          {error}
        </span>
      )}
    </>
  );
}
