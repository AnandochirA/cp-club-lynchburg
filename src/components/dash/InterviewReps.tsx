'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import '../../app/interview.css';
import { apiGet } from '@/lib/client-api';
import type { InterviewSummary } from '@/lib/interview';
import { RUBRIC, interviewCopy } from '@/lib/interview-kit';
import { SCORE_KEYS, findProblem } from '@/lib/interview-logic';
import { Icon } from '../icons';

const C = interviewCopy.reps;
const SPARK = 10;

/**
 * Your mock interviews so far: average self-score per signal (the weakest one
 * called out), how much of each round you spent talking, and the last few
 * rounds. Loads on its own so the rest of the dashboard never waits for it.
 */
export function InterviewReps() {
  const [rounds, setRounds] = useState<InterviewSummary[] | null>(null);

  useEffect(() => {
    let live = true;
    apiGet<{ sessions: InterviewSummary[] }>('/api/interview').then((res) => {
      if (live) setRounds(res.ok ? res.data.sessions : []);
    });
    return () => {
      live = false;
    };
  }, []);

  if (rounds === null) return null;

  const scored = rounds.filter((r) => r.scores && SCORE_KEYS.every((k) => r.scores![k] > 0));
  const avg = Object.fromEntries(
    SCORE_KEYS.map((k) => [k, scored.length ? scored.reduce((n, r) => n + r.scores![k], 0) / scored.length : 0]),
  ) as Record<(typeof SCORE_KEYS)[number], number>;
  const weakest = scored.length ? SCORE_KEYS.reduce((a, b) => (avg[b] < avg[a] ? b : a)) : null;
  const talk = rounds.filter((r) => r.talkStats?.mic).slice(0, SPARK).reverse();

  return (
    <section className="panel flex flex-col gap-5 p-5 lg:p-7" aria-labelledby="reps-title">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="flex flex-col gap-1.5">
          <span className="eyebrow-m">{C.eyebrow}</span>
          <h2 id="reps-title" className="font-display caps m-0 text-[34px] leading-[0.9] font-black lg:text-[40px]">
            {C.title}
          </h2>
        </div>
        {rounds.length > 0 && <span className="font-mono text-[13px] text-white/55">{C.sessions(rounds.length)}</span>}
      </div>

      {rounds.length === 0 ? (
        <p className="m-0 max-w-[62ch] text-[15px] leading-[1.5] text-muted">{C.empty}</p>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-3">
            {RUBRIC.map((r) => (
              <div key={r.key} className="iv-dim flex flex-col gap-1.5" data-weak={weakest === r.key ? '1' : undefined}>
                <span className="flex items-baseline justify-between gap-2 text-[14px]">
                  <span className="text-soft">
                    {r.title}
                    {weakest === r.key && <span className="font-mono ml-2 text-[11.5px] text-gold">{C.weakest}</span>}
                  </span>
                  <span className="font-mono text-[12.5px] text-dim">{avg[r.key] ? avg[r.key].toFixed(1) : '–'} / 4</span>
                </span>
                <span className="iv-dim-bar" aria-hidden="true">
                  <i style={{ width: `${(avg[r.key] / 4) * 100}%` }} />
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-mono text-[12px] tracking-[0.1em] text-dim uppercase">{C.talk}</span>
            {talk.length === 0 ? (
              <p className="m-0 text-[14px] text-muted">{interviewCopy.review.noMic}</p>
            ) : (
              <>
                <div className="iv-spark" role="img" aria-label={talk.map((r) => `${Math.round(r.talkStats!.talkRatio * 100)}%`).join(', ')}>
                  {talk.map((r) => (
                    <i key={r.id} style={{ height: `${Math.max(4, r.talkStats!.talkRatio * 100)}%` }} />
                  ))}
                </div>
                <span className="font-mono text-[12.5px] text-muted">
                  latest {Math.round(talk[talk.length - 1].talkStats!.talkRatio * 100)}%
                </span>
              </>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-mono text-[12px] tracking-[0.1em] text-dim uppercase">{C.recent}</span>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {rounds.slice(0, 4).map((r) => {
                const p = findProblem(r.slug);
                const s = r.scores && SCORE_KEYS.every((k) => r.scores![k] > 0) ? SCORE_KEYS.reduce((n, k) => n + r.scores![k], 0) / 4 : null;
                return (
                  <li key={r.id}>
                    <Link
                      href={`/interview/${r.slug}`}
                      className="flex items-center gap-3 border border-transparent bg-white/4 px-3 py-2 text-text no-underline hover:bg-white/8 hover:text-text"
                    >
                      <span className={`shrink-0 ${r.acAfterStart ? 'text-[#52D68A]' : 'text-dim'}`} aria-label={r.acAfterStart ? 'Accepted' : 'Not accepted'}>
                        {r.acAfterStart ? <Icon name="check" size={14} stroke={3} /> : '·'}
                      </span>
                      <span className="min-w-0 flex-grow truncate text-[14.5px]">{p?.title ?? r.slug}</span>
                      <span className="font-mono shrink-0 text-[12px] text-dim">{s ? s.toFixed(1) : '–'}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
