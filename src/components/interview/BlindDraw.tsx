'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import '../../app/dash.css';
import '../../app/interview.css';
import { apiErrors, rankSection } from '@/lib/content';
import { apiPost } from '@/lib/client-api';
import type { Problem } from '@/lib/curriculum';
import type { InterviewRecord } from '@/lib/interview';
import { interviewCopy as C } from '@/lib/interview-kit';
import { findProblem } from '@/lib/interview-logic';
import { useCalm } from '../dash/hooks';
import { Icon } from '../icons';

const B = C.blind;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const diffColor = (d: string) => rankSection.difficulties.find((x) => x.label === d.toLowerCase())?.color ?? '#A7A8AA';

function announce(text: string) {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(u);
}

type Phase = 'idle' | 'shuffle' | 'reveal' | 'count';

/**
 * The blind draw. A face-down deck shuffles while the server picks your
 * problem, the top card flips to show only its title (the topic stays
 * redacted), then a 3-2-1 and you are in the round with the clock running.
 * Under reduced motion the card is simply shown, with a Start button.
 */
export function BlindDraw() {
  const router = useRouter();
  const calm = useCalm();
  const [phase, setPhase] = useState<Phase>('idle');
  const [problem, setProblem] = useState<Problem | null>(null);
  const [count, setCount] = useState(3);
  const [error, setError] = useState<string | null>(null);

  const go = (p: Problem) => router.push(`/interview/${p.slug}?go=1`);

  async function draw() {
    if (phase !== 'idle') return;
    setError(null);
    setPhase('shuffle');
    const [res] = await Promise.all([
      apiPost<{ interview: InterviewRecord }>('/api/interview', { mode: 'blind' }),
      wait(calm ? 0 : 1400),
    ]);
    if (!res.ok) {
      setPhase('idle');
      return setError(apiErrors[res.error] ?? apiErrors.server);
    }
    const p = findProblem(res.data.interview.slug);
    if (!p) {
      setPhase('idle');
      return setError(apiErrors.server);
    }
    setProblem(p);
    setPhase('reveal');
    announce(B.announce(p.title));
    if (calm) return;
    await wait(1700);
    setPhase('count');
    for (const n of [3, 2, 1]) {
      setCount(n);
      await wait(850);
    }
    go(p);
  }

  return (
    <div className="dash" style={{ ['--tier' as string]: problem ? diffColor(problem.difficulty) : '#e4002b' }}>
      <div className="dash-aurora" aria-hidden="true">
        <i />
        <i />
        <b className="hex-bg-ink" />
      </div>
      <header className="dash-bar">
        <Link href="/me" className="font-mono text-sm text-muted no-underline hover:text-text">
          ← {C.back}
        </Link>
        <span className="font-mono text-[12px] tracking-[0.14em] text-white/55 uppercase">{B.eyebrow}</span>
      </header>

      <main className="dash-wrap">
        <div className="bd-stage" data-phase={phase}>
          <div className="bd-copy">
            <span className="eyebrow-m">{B.eyebrow}</span>
            <h1 className="bd-title font-display caps m-0">{B.title}</h1>
            <p className="m-0 max-w-[46ch] text-[16px] leading-[1.55] text-soft">{B.lead}</p>
            <ul className="bd-rules m-0 list-none p-0" aria-label="Rules">
              {B.rules.map((r) => (
                <li key={r} className="font-mono">
                  {r}
                </li>
              ))}
            </ul>
            {error && (
              <p role="alert" className="notice">
                {error}
              </p>
            )}
            {phase === 'idle' || phase === 'shuffle' ? (
              <button
                type="button"
                onClick={draw}
                disabled={phase !== 'idle'}
                className="btn btn-primary [clip-path:polygon(0_0,calc(100%-12px)_0,100%_12px,100%_100%,0_100%)] flex h-14 w-fit cursor-pointer items-center justify-center gap-3 rounded-none border-0 px-8 font-sans text-[16.5px] font-semibold text-white"
              >
                <span className="sheen" aria-hidden="true" />
                {phase === 'shuffle' ? B.drawing : B.draw}
                <Icon name="arrow" size={18} stroke={2.2} className="arrow" />
              </button>
            ) : calm && problem ? (
              <button
                type="button"
                onClick={() => go(problem)}
                className="btn btn-primary flex h-14 w-fit cursor-pointer items-center justify-center gap-3 rounded-none border-0 px-8 font-sans text-[16.5px] font-semibold text-white"
              >
                {C.start}
                <Icon name="arrow" size={18} stroke={2.2} />
              </button>
            ) : null}
          </div>

          <div className="bd-table" aria-live="polite">
            <div className="bd-deck" aria-hidden={phase === 'reveal' || phase === 'count' ? undefined : 'true'}>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="bd-card" style={{ ['--k' as string]: i }}>
                  <div className="bd-back">
                    <span className="bd-back-mark font-display">?</span>
                  </div>
                  {i === 4 && problem && (
                    <div className="bd-face" style={{ ['--band' as string]: diffColor(problem.difficulty) }}>
                      <span className="bd-face-band" />
                      <span className="font-mono text-[11.5px] tracking-[0.16em] text-ink-muted uppercase">{B.yourProblem}</span>
                      <span className="bd-face-title font-display caps">{problem.title}</span>
                      <span className="font-mono flex items-center gap-3 text-[13px] text-ink-muted">
                        <span>#{problem.id}</span>
                        <b style={{ color: diffColor(problem.difficulty) }}>{problem.difficulty.toLowerCase()}</b>
                      </span>
                      <span className="bd-redact font-mono">
                        <span className="sr-only">{B.hidden}</span>
                        <i aria-hidden="true">TOPIC</i>
                        <b aria-hidden="true" />
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {phase === 'count' && (
              <div className="bd-count" role="timer" aria-label={`${B.startsIn} ${count}`}>
                <span className="font-mono text-[12px] tracking-[0.16em] text-white/60 uppercase">{B.startsIn}</span>
                <span key={count} className="bd-count-n font-display">
                  {count}
                </span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
