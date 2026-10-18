'use client';

import { STAGES, type StageId } from '@/lib/interview-kit';
import { clock, type Draft } from '@/lib/interview-logic';
import { Icon } from '../icons';

/**
 * The seven steps of the round, in order. The current one is lit, finished
 * ones are checked, skipped ones are struck through, and a step that ran over
 * its budget shows its time in amber. Any step can be revisited, as in a real
 * interview where you loop back to the approach.
 */
export function StageRail({
  draft,
  liveMs,
  onPick,
}: {
  draft: Draft;
  /** Time on the current step that has not been folded into the draft yet. */
  liveMs: number;
  onPick: (id: StageId) => void;
}) {
  return (
    <nav aria-label="Interview steps">
      <ol className="iv-rail m-0 list-none p-0">
        {STAGES.map((s, i) => {
          const st = draft.stages[s.id];
          const current = draft.stage === s.id;
          const ms = st.ms + (current ? liveMs : 0);
          const over = ms > s.minutes * 60_000;
          const state = current ? 'current' : st.skipped ? 'skipped' : st.done ? 'done' : 'todo';
          return (
            <li key={s.id}>
              <button
                type="button"
                className="iv-step"
                data-state={state}
                aria-current={current ? 'step' : undefined}
                onClick={() => onPick(s.id)}
              >
                <span className="iv-step-dot" aria-hidden="true">
                  {state === 'done' ? <Icon name="check" size={12} stroke={3.2} /> : i + 1}
                </span>
                <span className="iv-step-title">{s.title}</span>
                <span className="iv-step-time font-mono" data-over={over ? '1' : undefined}>
                  {ms > 0 ? clock(ms) : `${s.minutes}m`}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
