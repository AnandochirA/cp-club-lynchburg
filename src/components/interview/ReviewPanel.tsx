'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Problem } from '@/lib/curriculum';
import type { InterviewRecord } from '@/lib/interview';
import { RUBRIC, SCORE_LABELS, STAGES, interviewCopy as C } from '@/lib/interview-kit';
import { SCORE_KEYS, clock, type Scores } from '@/lib/interview-logic';
import { Icon } from '../icons';
import { Transcript } from './Transcript';

const R = C.review;
const blank = (): Scores => Object.fromEntries(SCORE_KEYS.map((k) => [k, 0])) as Scores;

/**
 * After the round: the evidence (talk stats, time per step, the transcript)
 * next to a self-score on the four signals interviewers grade.
 */
export function ReviewPanel({
  record,
  problem,
  onSaveScores,
  onRecheck,
}: {
  record: InterviewRecord;
  problem: Problem;
  onSaveScores: (s: Scores) => Promise<boolean>;
  onRecheck: () => Promise<void>;
}) {
  const [scores, setScores] = useState<Scores>(record.scores ?? blank());
  const [busy, setBusy] = useState<'save' | 'check' | null>(null);
  const [saved, setSaved] = useState(false);
  const t = record.talkStats;
  const d = record.draft;

  async function save() {
    setBusy('save');
    setSaved(await onSaveScores(scores));
    setBusy(null);
  }

  async function check() {
    setBusy('check');
    await onRecheck();
    setBusy(null);
  }

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <section className="panel flex flex-col gap-5 p-5 lg:p-7" aria-labelledby="review-title">
        <div className="flex flex-col gap-1.5">
          <span className="eyebrow-m">{R.eyebrow}</span>
          <h2 id="review-title" className="font-display caps m-0 text-[44px] leading-[0.88] font-black lg:text-[56px]">
            {R.title}
          </h2>
          <p className="m-0 max-w-[62ch] text-[15.5px] leading-[1.5] text-soft">{R.lead}</p>
        </div>

        {t && (
          <dl className="iv-stats m-0">
            <div>
              <dt>{R.time}</dt>
              <dd>{clock(t.totalMs)}</dd>
            </div>
            {t.mic ? (
              <>
                <div>
                  <dt>{R.talkRatio}</dt>
                  <dd>{Math.round(t.talkRatio * 100)}%</dd>
                </div>
                <div>
                  <dt>{R.longestSilence}</dt>
                  <dd>{clock(t.longestSilenceMs)}</dd>
                </div>
                <div>
                  <dt>{R.nudges}</dt>
                  <dd>{t.nudges}</dd>
                </div>
              </>
            ) : (
              <p className="m-0 self-center text-[14px] text-muted">{R.noMic}</p>
            )}
          </dl>
        )}

        <p
          className={`m-0 flex flex-wrap items-center gap-3 text-[15px] ${record.acAfterStart ? 'text-[#52D68A]' : 'text-soft'}`}
          role="status"
        >
          {record.acAfterStart && <Icon name="check" size={16} stroke={3} />}
          {record.acAfterStart ? R.acYes : R.acNo}
          {!record.acAfterStart && (
            <button type="button" onClick={check} disabled={busy !== null} className="iv-link">
              {busy === 'check' ? R.acChecking : R.acCheck}
            </button>
          )}
        </p>

        <div className="flex flex-col gap-2">
          <span className="font-mono text-[12px] tracking-[0.1em] text-dim uppercase">{R.perStage}</span>
          <table className="iv-table">
            <tbody>
              {STAGES.map((s) => {
                const st = d.stages[s.id];
                const over = st.ms > s.minutes * 60_000;
                return (
                  <tr key={s.id}>
                    <th scope="row">{s.title}</th>
                    <td className={over ? 'text-gold' : undefined}>
                      {st.skipped ? R.skipped : `${clock(st.ms)} / ${s.minutes}:00`}
                    </td>
                    <td>{d.mic && st.ms > 0 ? `${Math.round((Math.min(st.talkMs, st.ms) / st.ms) * 100)}% talking` : ''}</td>
                    <td>{d.mic && st.longestSilenceMs >= 10_000 ? `${clock(st.longestSilenceMs)} quiet` : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel flex flex-col gap-5 p-5 lg:p-7" aria-label="Self-score">
        {RUBRIC.map((r) => (
          <fieldset key={r.key} className="m-0 flex flex-col gap-2.5 border-0 p-0">
            <legend className="mb-1 p-0 text-[17px] font-semibold text-text">{r.title}</legend>
            <div className="grid gap-1 text-[13.5px] leading-[1.45] text-muted sm:grid-cols-2 sm:gap-4">
              <p className="m-0">
                <span className="font-mono text-dim">1 · </span>
                {r.low}
              </p>
              <p className="m-0">
                <span className="font-mono text-dim">4 · </span>
                {r.high}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4].map((n) => (
                <label key={n} className="iv-score">
                  <input
                    type="radio"
                    name={r.key}
                    checked={scores[r.key] === n}
                    onChange={() => {
                      setScores((s) => ({ ...s, [r.key]: n }));
                      setSaved(false);
                    }}
                  />
                  <span>
                    <b className="font-display">{n}</b> {SCORE_LABELS[n]}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <div className="flex flex-wrap items-center gap-4 border-t border-white/8 pt-5">
          <button
            type="button"
            onClick={save}
            disabled={busy !== null || SCORE_KEYS.some((k) => scores[k] === 0)}
            className="btn btn-primary [clip-path:polygon(0_0,calc(100%-10px)_0,100%_10px,100%_100%,0_100%)] flex h-12 cursor-pointer items-center justify-center rounded-none border-0 px-6 font-sans text-[15px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="sheen" aria-hidden="true" />
            {R.save}
          </button>
          {saved && (
            <span role="status" className="font-mono text-[13px] text-[#52D68A]">
              {R.savedScores}
            </span>
          )}
          <Link href="/me" className="iv-link no-underline">
            {R.again}
          </Link>
        </div>
      </section>

      <section className="panel flex flex-col gap-4 p-5 lg:p-7" aria-label={R.yourNotes}>
        <h3 className="font-display caps m-0 text-[28px] leading-[0.95] font-black">{R.yourNotes}</h3>
        {STAGES.filter((s) => d.stages[s.id].notes.trim()).length === 0 ? (
          <p className="m-0 text-[14.5px] text-muted">—</p>
        ) : (
          STAGES.filter((s) => d.stages[s.id].notes.trim()).map((s) => (
            <div key={s.id} className="flex flex-col gap-1.5">
              <span className="font-mono text-[12px] tracking-[0.1em] text-dim uppercase">{s.title}</span>
              <pre className="iv-pre m-0">{d.stages[s.id].notes}</pre>
            </div>
          ))
        )}
        <h3 className="font-display caps m-0 mt-2 text-[28px] leading-[0.95] font-black">{C.transcript}</h3>
        <Transcript lines={d.transcript} />
        <p className="m-0 font-mono text-[12.5px] text-dim">
          {problem.title} · #{problem.id} · {problem.difficulty.toLowerCase()}
        </p>
      </section>
    </div>
  );
}
