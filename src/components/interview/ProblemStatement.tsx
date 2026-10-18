'use client';

import { useEffect, useState } from 'react';
import { apiErrors } from '@/lib/content';
import { apiGet } from '@/lib/client-api';
import { interviewCopy as C } from '@/lib/interview-kit';
import { Icon } from '../icons';

type State = { kind: 'loading' } | { kind: 'ok'; html: string } | { kind: 'paid' } | { kind: 'error'; message: string };

/**
 * The problem as LeetCode states it, right here, so reading, clarifying,
 * edge cases, approach and pseudocode all happen without leaving the round.
 * The HTML was rebuilt from an allowlist on the server before it got here.
 */
export function ProblemStatement({ slug }: { slug: string }) {
  const [s, setS] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let live = true;
    apiGet<{ statement: { html: string | null; paid: boolean } }>(`/api/problem/${slug}`).then((res) => {
      if (!live) return;
      if (!res.ok) return setS({ kind: 'error', message: apiErrors[res.error] ?? apiErrors.server });
      const st = res.data.statement;
      setS(st.html ? { kind: 'ok', html: st.html } : st.paid ? { kind: 'paid' } : { kind: 'error', message: C.statement.missing });
    });
    return () => {
      live = false;
    };
  }, [slug]);

  const link = (
    <a href={`https://leetcode.com/problems/${slug}/`} target="_blank" rel="noopener noreferrer" className="iv-link inline-flex items-center gap-1.5 no-underline">
      {C.statement.source} <Icon name="external" size={13} stroke={2.2} />
    </a>
  );

  return (
    <div className="flex flex-col gap-3">
      {s.kind === 'loading' && (
        <div className="iv-statement-skel" aria-label={C.statement.loading}>
          <i />
          <i />
          <i />
          <i />
        </div>
      )}
      {s.kind === 'ok' && <div className="iv-statement" dangerouslySetInnerHTML={{ __html: s.html }} />}
      {s.kind === 'paid' && <p className="notice">{C.statement.paid}</p>}
      {s.kind === 'error' && <p className="notice">{s.message}</p>}
      <div className="font-mono text-[12px] text-dim">{link}</div>
    </div>
  );
}
