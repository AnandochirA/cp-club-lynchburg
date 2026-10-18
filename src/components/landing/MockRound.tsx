'use client';

import { useEffect, useRef, useState } from 'react';
import { demoRound as D } from '@/lib/content';
import { STAGES, TOTAL_MINUTES } from '@/lib/interview-kit';

/**
 * The hero's signature: a mock round that plays itself, sped up. The rail is
 * the real seven steps drawn to scale, the clock runs to each line's moment,
 * lines type themselves out, the code goes in line by line, and the round
 * ends on LeetCode's Accepted and then the stamp that matters.
 *
 * It renders its last frame on the server (and stays there under reduced
 * motion), then rewinds to the start once it is on screen. Decorative to
 * assistive tech: the figure's caption says what it shows.
 */

type Frame = {
  /** Lines fully shown. */
  done: number;
  /** Characters of the line being typed (or code lines, on the code step). */
  typed: number;
  clock: number;
  phase: 'play' | 'accepted' | 'stamp';
};

const LAST: Frame = { done: D.script.length, typed: 0, clock: 44.1, phase: 'stamp' };
const START: Frame = { done: 0, typed: 0, clock: 0, phase: 'play' };
const SHOW = 5;

const CHAR_MS = 24;
const CODE_LINE_MS = 210;
const PAUSE_MS = 650;

const stageIndex = (id: string) => STAGES.findIndex((s) => s.id === id);

function mmss(min: number) {
  const s = Math.floor(min * 60);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function MockRound() {
  const [f, setF] = useState<Frame>(LAST);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = box.current;
    if (!el) return;
    let visible = false;
    let timer = 0;
    let frame: Frame = LAST;
    const set = (next: Frame) => {
      frame = next;
      setF(next);
    };

    const step = () => {
      if (!visible || document.hidden) {
        timer = window.setTimeout(step, 400);
        return;
      }
      const fr = frame;
      if (fr.phase === 'stamp') {
        set(START);
        timer = window.setTimeout(step, 700);
        return;
      }
      if (fr.phase === 'accepted') {
        set({ ...fr, phase: 'stamp' });
        timer = window.setTimeout(step, 4600);
        return;
      }
      const line = D.script[fr.done];
      if (!line) {
        set({ ...fr, clock: 44.1, phase: 'accepted' });
        timer = window.setTimeout(step, 1100);
        return;
      }
      const from = fr.done === 0 ? 0 : D.script[fr.done - 1].at;
      const length = line.who === 'code' ? D.code.length : line.text.length;
      if (fr.typed < length) {
        const typed = fr.typed + 1;
        set({ ...fr, typed, clock: from + (line.at - from) * (typed / length) });
        timer = window.setTimeout(step, line.who === 'code' ? CODE_LINE_MS : CHAR_MS);
        return;
      }
      set({ done: fr.done + 1, typed: 0, clock: line.at, phase: 'play' });
      timer = window.setTimeout(step, PAUSE_MS);
    };

    const io = new IntersectionObserver(([e]) => {
      const was = visible;
      visible = e.isIntersecting;
      // The first time it comes into view, rewind and play from the top.
      if (visible && !was && frame === LAST) {
        set(START);
        window.clearTimeout(timer);
        timer = window.setTimeout(step, 900);
      }
    }, { threshold: 0.35 });
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  // What is on screen: finished lines, plus the one being typed.
  const shown = D.script.slice(0, f.done).map((l) => ({ ...l, partial: null as number | null }));
  const current = D.script[f.done];
  if (current && f.phase === 'play' && f.typed > 0) shown.push({ ...current, partial: f.typed });
  const visibleLines = shown.slice(-SHOW);

  const active = current && f.phase === 'play' ? stageIndex(current.stage) : STAGES.length;
  const elapsedIn = (i: number) => {
    const before = STAGES.slice(0, i).reduce((n, s) => n + s.minutes, 0);
    return Math.min(1, Math.max(0, (f.clock - before) / STAGES[i].minutes));
  };
  const label = active < STAGES.length ? STAGES[active] : null;

  return (
    <div ref={box} className="mr" aria-hidden="true">
      <div className="mr-head">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="mr-kicker font-mono">
            <span className="mr-rec" /> mock round
          </span>
          <span className="mr-title font-display caps">{D.problem.title}</span>
          <span className="font-mono text-[11.5px] text-white/50">{D.problem.meta}</span>
        </div>
        <div className="mr-clock font-mono">
          <b>{mmss(f.clock)}</b>
          <span>/ {TOTAL_MINUTES}:00</span>
        </div>
      </div>

      <div className="mr-rail">
        {STAGES.map((s, i) => (
          <span key={s.id} className="mr-seg" data-on={i === active ? '1' : undefined} style={{ flexGrow: s.minutes }}>
            <i style={{ scale: `${i < active ? 1 : i === active ? elapsedIn(i) : 0} 1` }} />
          </span>
        ))}
      </div>
      <div className="mr-step font-mono">
        {label ? (
          <>
            <span>
              step {active + 1}/{STAGES.length}
            </span>
            <b>{label.title}</b>
            <span>{label.minutes} min</span>
          </>
        ) : (
          <>
            <span>round over</span>
            <b>Review</b>
          </>
        )}
      </div>

      <div className="mr-log">
        {visibleLines.map((l) =>
          l.who === 'code' ? (
            <pre key={`${l.stage}-code`} className="mr-code font-mono">
              {D.code.slice(0, l.partial ?? D.code.length).map((c, i) => (
                <span key={i} className="block">
                  <span className="mr-ln">{i + 1}</span>
                  {c}
                </span>
              ))}
            </pre>
          ) : (
            <p key={`${l.stage}-${l.text}`} className="mr-line" data-who={l.who}>
              <span className="mr-who font-mono">{l.who === 'coach' ? 'coach' : 'you'}</span>
              <span>
                {l.partial === null ? l.text : l.text.slice(0, l.partial)}
                {l.partial !== null && <span className="mr-caret" />}
              </span>
            </p>
          ),
        )}
      </div>

      <div className="mr-foot">
        <span className="verdict on-ink" data-v={f.phase === 'play' ? 'wait' : 'ac'}>
          {f.phase === 'play' ? 'Not submitted' : D.accepted}
        </span>
        {f.phase === 'stamp' && (
          <div className="mr-stamp">
            <span className="font-mono">{D.stamp.who}</span>
            <b className="font-display caps">{D.stamp.word}</b>
            <span className="font-mono">{D.stamp.sub}</span>
          </div>
        )}
      </div>
    </div>
  );
}
