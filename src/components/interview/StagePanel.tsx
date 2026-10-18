'use client';

import type { Problem } from '@/lib/curriculum';
import { interviewCopy as C, type Stage } from '@/lib/interview-kit';
import { MAX_NOTES, clock, type StageState } from '@/lib/interview-logic';
import { Icon } from '../icons';

/**
 * The step you are on: what the interviewer just asked, a notes box, and a
 * checklist of what a strong candidate does at this point.
 */
export function StagePanel({
  stage,
  index,
  state,
  checklist,
  coachLine,
  speaking,
  who,
  elapsedMs,
  problem,
  isLast,
  busy,
  onRepeat,
  onNotes,
  onToggle,
  onNext,
  onSkip,
  canSkip = true,
  children,
}: {
  stage: Stage;
  index: number;
  state: StageState;
  checklist: string[];
  coachLine: string;
  speaking: boolean;
  /** Who is talking, for the card's caption. */
  who?: string;
  elapsedMs: number;
  problem: Problem;
  isLast: boolean;
  busy: boolean;
  onRepeat: () => void;
  onNotes: (notes: string) => void;
  onToggle: (i: number) => void;
  onNext: () => void;
  onSkip: () => void;
  /** Blind rounds take this away. */
  canSkip?: boolean;
  /** Extra controls for this step (the blind pattern call, the curveball). */
  children?: React.ReactNode;
}) {
  const budget = stage.minutes * 60_000;
  const over = elapsedMs > budget;
  // The last two minutes of a step: the clock starts to pulse.
  const pressure = !over && budget - elapsedMs <= 120_000;
  const pct = Math.min(100, (elapsedMs / budget) * 100);
  // The statement is on this page now; LeetCode is only needed to write and submit the code.
  const showLeetCode = stage.id === 'code';

  return (
    <section className="panel flex flex-col gap-5 p-5 lg:p-7" aria-labelledby="stage-title">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="flex flex-col gap-1.5">
          <span className="eyebrow-m">
            Step {index + 1} of 7 · {stage.minutes} min
          </span>
          <h2 id="stage-title" className="font-display caps m-0 text-[40px] leading-[0.88] font-black lg:text-[52px]">
            {stage.title}
          </h2>
          <p className="m-0 max-w-[60ch] text-[15.5px] leading-[1.5] text-soft">{stage.goal}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span
            className={`iv-clock font-display text-[44px] leading-[0.8] font-black tabular-nums ${over ? 'text-gold' : 'text-text'}`}
            data-pressure={pressure ? '1' : undefined}
            aria-live="off"
          >
            {clock(elapsedMs)}
          </span>
          <span className="font-mono text-[12px] text-dim">
            of {stage.minutes}:00{over && <span className="text-gold"> · {C.over}</span>}
          </span>
        </div>
      </header>

      <div className="iv-bar" data-over={over ? '1' : undefined} aria-hidden="true">
        <i style={{ width: `${pct}%` }} />
      </div>

      <figure className="iv-coach m-0" data-speaking={speaking ? '1' : undefined}>
        <figcaption className="font-mono flex items-center justify-between gap-3 text-[11.5px] tracking-[0.14em] text-white/55 uppercase">
          <span className="flex items-center gap-2">
            <i className="iv-wave" aria-hidden="true">
              <b />
              <b />
              <b />
            </i>
            {who ?? C.interviewer}
          </span>
          <button type="button" onClick={onRepeat} className="iv-link">
            {C.repeat}
          </button>
        </figcaption>
        <blockquote className="m-0 text-[17.5px] leading-[1.5] text-text" aria-live="polite">
          {coachLine}
        </blockquote>
      </figure>

      {children}

      {showLeetCode && (
        <a
          href={`https://leetcode.com/problems/${problem.slug}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost flex h-12 w-fit items-center gap-2.5 rounded-none px-5 text-[15px] font-semibold text-text no-underline hover:text-text"
        >
          {C.openLeetCode}
          <Icon name="external" size={15} stroke={2.2} />
        </a>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <label className="flex flex-col gap-2">
          <span className="font-mono text-[12px] tracking-[0.1em] text-dim uppercase">{C.notes}</span>
          <textarea
            className="iv-notes"
            value={state.notes}
            maxLength={MAX_NOTES}
            onChange={(e) => onNotes(e.target.value)}
            placeholder={stage.notesPlaceholder}
            rows={stage.id === 'pseudo' ? 12 : 8}
            spellCheck={stage.id !== 'pseudo'}
          />
        </label>

        {checklist.length > 0 && (
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="font-mono mb-2 p-0 text-[12px] tracking-[0.1em] text-dim uppercase">
              {C.checklist} · {state.checked.length}/{checklist.length}
            </legend>
            {checklist.map((item, i) => (
              <label key={item} className="iv-check">
                <input type="checkbox" checked={state.checked.includes(i)} onChange={() => onToggle(i)} />
                <span>{item}</span>
              </label>
            ))}
          </fieldset>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-white/8 pt-5">
        <button
          type="button"
          onClick={onNext}
          disabled={busy}
          className="btn btn-primary [clip-path:polygon(0_0,calc(100%-10px)_0,100%_10px,100%_100%,0_100%)] flex h-12 cursor-pointer items-center justify-center gap-2.5 rounded-none border-0 px-6 font-sans text-[15px] font-semibold text-white"
        >
          <span className="sheen" aria-hidden="true" />
          {isLast ? (busy ? C.finishing : C.finish) : C.next}
          <Icon name="arrow" size={17} stroke={2.2} className="arrow" />
        </button>
        {!isLast && canSkip && (
          <button type="button" onClick={onSkip} disabled={busy} className="iv-link">
            {C.skip}
          </button>
        )}
      </div>
    </section>
  );
}
