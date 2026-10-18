'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Problem } from '@/lib/curriculum';
import type { InterviewRecord, PostMortem } from '@/lib/interview';
import { MISTAKES, RUBRIC, SCORE_LABELS, STAGES, interviewCopy as C } from '@/lib/interview-kit';
import {
  MAX_NEXT_TIME,
  MISTAKE_KEYS,
  SCORE_KEYS,
  clock,
  signals,
  verdictOf,
  type MistakeKey,
  type Scores,
} from '@/lib/interview-logic';
import { Icon } from '../icons';
import { Transcript } from './Transcript';
import { VerdictStamp } from './VerdictStamp';

const R = C.review;
const blank = (): Scores => Object.fromEntries(SCORE_KEYS.map((k) => [k, 0])) as Scores;

/**
 * After the round. The verdict sits on top, pending until you score yourself.
 * Under it, the evidence: signals measured from your transcript, time per
 * step, then the self-score and the post-mortem that feed the dashboard.
 */
export function ReviewPanel({
  record,
  problem,
  onLockIn,
  onRecheck,
}: {
  record: InterviewRecord;
  problem: Problem;
  onLockIn: (pm: PostMortem) => Promise<boolean>;
  onRecheck: () => Promise<void>;
}) {
  const [scores, setScores] = useState<Scores>(record.scores ?? blank());
  const [mistakes, setMistakes] = useState<MistakeKey[]>(record.mistakes);
  const [nextTime, setNextTime] = useState(record.nextTime ?? '');
  const [busy, setBusy] = useState<'save' | 'check' | null>(null);
  const [slam, setSlam] = useState(false);
  const [saved, setSaved] = useState(false);
  const t = record.talkStats;
  const d = record.draft;
  const verdict = verdictOf(record.scores);
  const date = new Date(record.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  async function lockIn() {
    setBusy('save');
    const ok = await onLockIn({ scores, mistakes, nextTime });
    setBusy(null);
    if (!ok) return;
    setSaved(true);
    setSlam(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function check() {
    setBusy('check');
    await onRecheck();
    setBusy(null);
  }

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <section className="panel iv-hero flex flex-col gap-6 p-5 lg:p-8" data-hit={slam ? '1' : undefined} aria-labelledby="review-title">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-1.5">
            <span className="eyebrow-m">{R.eyebrow}</span>
            <h2 id="review-title" className="font-display caps m-0 text-[44px] leading-[0.88] font-black lg:text-[60px]">
              {problem.title}
            </h2>
            <span className="font-mono text-[12.5px] text-muted">
              #{problem.id} · {problem.difficulty.toLowerCase()} · {problem.topic}
            </span>
          </div>
          <VerdictStamp key={verdict ?? 'pending'} verdict={verdict} date={date} slam={slam} />
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
          {record.acAfterStart ? (
            <span className="verdict on-ink" data-v="ac">
              <span className="tick">
                <Icon name="check" size={10} stroke={3.4} />
              </span>
              Accepted
            </span>
          ) : (
            <span className="verdict on-ink" data-v="wait">
              No AC yet
            </span>
          )}
          {record.acAfterStart ? R.acYes : R.acNo}
          {!record.acAfterStart && (
            <button type="button" onClick={check} disabled={busy !== null} className="iv-link">
              {busy === 'check' ? R.acChecking : R.acCheck}
            </button>
          )}
        </p>
      </section>

      {record.metrics && (
        <section className="panel flex flex-col gap-4 p-5 lg:p-7" aria-labelledby="signals-title">
          <div className="flex flex-col gap-1.5">
            <h3 id="signals-title" className="font-display caps m-0 text-[28px] leading-[0.95] font-black">
              {R.signals}
            </h3>
            <p className="m-0 text-[14px] text-muted">{R.signalsNote}</p>
          </div>
          <ul className="iv-signals m-0 list-none p-0">
            {signals(record.metrics).map((s, i) => (
              <li key={s.key} className="iv-signal" data-grade={s.grade} style={{ ['--n' as string]: i }}>
                <span className="iv-signal-label font-mono">{s.label}</span>
                <span className="iv-signal-value font-display">{s.value}</span>
                <span className="iv-signal-target font-mono">
                  {R.target} {s.target}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel flex flex-col gap-2 p-5 lg:p-7" aria-label={R.perStage}>
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
      </section>

      <section className="panel flex flex-col gap-6 p-5 lg:p-7" aria-label="Self-score">
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

        <fieldset className="m-0 flex flex-col gap-2.5 border-0 border-t border-white/8 p-0 pt-6">
          <legend className="mb-1 p-0 text-[17px] font-semibold text-text">{R.broke}</legend>
          <p className="m-0 text-[13.5px] text-muted">{R.brokeNote}</p>
          <div className="flex flex-wrap gap-2">
            {MISTAKE_KEYS.map((k) => (
              <label key={k} className="iv-chip">
                <input
                  type="checkbox"
                  checked={mistakes.includes(k)}
                  onChange={() => {
                    setMistakes((m) => (m.includes(k) ? m.filter((x) => x !== k) : [...m, k]));
                    setSaved(false);
                  }}
                />
                <span>{MISTAKES[k]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-2">
          <span className="text-[17px] font-semibold text-text">{R.nextTime}</span>
          <input
            type="text"
            className="iv-input"
            value={nextTime}
            maxLength={MAX_NEXT_TIME}
            placeholder={R.nextTimePlaceholder}
            onChange={(e) => {
              setNextTime(e.target.value);
              setSaved(false);
            }}
          />
          <span className="text-[13px] text-dim">{R.nextTimeNote}</span>
        </label>

        <div className="flex flex-wrap items-center gap-4 border-t border-white/8 pt-5">
          <button
            type="button"
            onClick={lockIn}
            disabled={busy !== null || SCORE_KEYS.some((k) => scores[k] === 0)}
            className="btn btn-primary [clip-path:polygon(0_0,calc(100%-10px)_0,100%_10px,100%_100%,0_100%)] flex h-13 cursor-pointer items-center justify-center gap-2.5 rounded-none border-0 px-7 font-sans text-[15.5px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="sheen" aria-hidden="true" />
            {R.save}
            <Icon name="hexcheck" size={17} stroke={2.2} />
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
          <p className="m-0 text-[14.5px] text-muted">No notes this round.</p>
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
      </section>
    </div>
  );
}
