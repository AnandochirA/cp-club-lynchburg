'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Problem } from '@/lib/curriculum';
import type { InterviewRecord, PostMortem } from '@/lib/interview';
import { MISTAKES, PERSONAS, RUBRIC, SCORE_LABELS, STAGES, interviewCopy as C, patternMatches } from '@/lib/interview-kit';
import { calibrate, signalScores } from '@/lib/film';
import { estimateCost } from '@/lib/interviewer-logic';
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
import { GameFilm } from './GameFilm';
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
  const [focus, setFocus] = useState<number | null>(null);
  const t = record.talkStats;
  const d = record.draft;
  const verdict = verdictOf(record.scores);
  const ai = record.aiReview;
  const debrief = ai?.debrief ?? null;
  const persona = PERSONAS[record.persona];
  const revealPersona = record.persona !== 'coach' || d.extras.mystery;
  // The yardstick for calibration: the AI's scores when there are any, else what the signals say.
  const blindHit = record.mode === 'blind' ? patternMatches(d.extras.pattern, problem.topic) : null;
  const bench = debrief?.scores ?? signalScores(record.metrics, t, record.acAfterStart, record.mistakes, blindHit);
  const calib = calibrate(record.scores, bench);
  const seek = (line: number) => {
    setFocus(line);
    document.getElementById('review-transcript')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
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
          <div className="iv-stamps">
            {debrief && <VerdictStamp verdict={debrief.verdict} date={date} slam who={C.aiReview.stamp} sub={persona.name} />}
            <VerdictStamp key={verdict ?? 'pending'} verdict={verdict} date={date} slam={slam} who={debrief ? C.aiReview.you : undefined} />
          </div>
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

      {revealPersona && (
        <section className="panel iv-reveal-persona flex flex-col gap-3 p-5 lg:p-7" data-persona={record.persona} aria-label={C.persona.revealTitle}>
          <span className="font-mono text-[11.5px] tracking-[0.14em] text-dim uppercase">{C.persona.revealTitle}</span>
          <span className="iv-reveal-name font-display caps">{persona.name}</span>
          <p className="m-0 max-w-[64ch] text-[15.5px] leading-[1.55] text-soft">{persona.reveal}</p>
        </section>
      )}

      {ai && (
        <section className="panel flex flex-col gap-6 p-5 lg:p-7" aria-labelledby="ai-title">
          <h3 id="ai-title" className="font-display caps m-0 text-[30px] leading-[0.95] font-black">
            {C.aiReview.title}
          </h3>
          {!debrief ? (
            <p className="m-0 text-[14.5px] text-muted">{C.aiReview.failed}</p>
          ) : (
            <>
              <p className="iv-ai-summary m-0">{debrief.summary}</p>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <span className="arena-h font-mono">{C.aiReview.strengths}</span>
                  <ul className="iv-ai-list m-0 p-0" data-tone="good">
                    {debrief.strengths.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="arena-h font-mono">{C.aiReview.concerns}</span>
                  <ul className="iv-ai-list m-0 p-0" data-tone="bad">
                    {debrief.concerns.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              </div>
              {debrief.markedDown && (
                <div className="iv-marked">
                  <span className="font-mono text-[11.5px] tracking-[0.14em] uppercase">
                    {C.aiReview.markedDown} · {debrief.markedDown.at}
                  </span>
                  <blockquote className="m-0">“{debrief.markedDown.quote}”</blockquote>
                  <p className="m-0 text-[14.5px] text-soft">{debrief.markedDown.why}</p>
                </div>
              )}
              {debrief.clarifications.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="arena-h font-mono">{C.aiReview.clarifications}</span>
                  <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                    {debrief.clarifications.map((c) => (
                      <li key={c.question} className="iv-clar" data-asked={c.asked ? '1' : undefined}>
                        <Icon name={c.asked ? 'check' : 'close'} size={14} stroke={3} />
                        <span className="flex-grow">{c.question}</span>
                        <span className="font-mono text-[11px] uppercase">{c.asked ? C.aiReview.asked : C.aiReview.missed}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
          {ai.brief && (
            <details className="iv-brief">
              <summary className="font-mono">{C.aiReview.notes}</summary>
              <p className="m-0 text-[13.5px] text-dim">{C.aiReview.notesLead}</p>
              <dl className="m-0 flex flex-col gap-3">
                <div>
                  <dt>{C.aiReview.brute}</dt>
                  <dd>
                    {ai.brief.bruteForce.approach} <span className="font-mono text-dim">({ai.brief.bruteForce.time} time, {ai.brief.bruteForce.space} space)</span>
                  </dd>
                </div>
                <div>
                  <dt>{C.aiReview.optimal}</dt>
                  <dd>
                    {ai.brief.optimal.approach} <span className="font-mono text-dim">({ai.brief.optimal.time} time, {ai.brief.optimal.space} space)</span>
                  </dd>
                </div>
                <div>
                  <dt>{C.aiReview.pitfalls}</dt>
                  <dd>{ai.brief.pitfalls.join(' · ')}</dd>
                </div>
              </dl>
            </details>
          )}
          <p className="m-0 font-mono text-[12px] text-dim">{C.aiReview.cost(`$${estimateCost(ai.usage).toFixed(3)}`)}</p>
        </section>
      )}

      {d.transcript.length > 1 && (
        <section className="panel flex flex-col gap-4 p-5 lg:p-7" aria-labelledby="film-title">
          <div className="flex flex-col gap-1.5">
            <h3 id="film-title" className="font-display caps m-0 text-[30px] leading-[0.95] font-black">
              {C.film.title}
            </h3>
            <p className="m-0 text-[14px] text-muted">{C.film.lead}</p>
          </div>
          <GameFilm draft={d} metrics={record.metrics} markedDown={debrief?.markedDown ?? null} onSeek={seek} />
        </section>
      )}

      {(record.mode === 'blind' || d.extras.curveAsked) && (
        <section className="panel flex flex-col gap-5 p-5 lg:p-7" aria-label={C.blind.pattern}>
          {record.mode === 'blind' && (
            <div className="iv-reveal">
              <div>
                <span className="font-mono text-[11.5px] tracking-[0.14em] text-dim uppercase">{C.blind.youCalled}</span>
                <span className="iv-reveal-word font-display caps">{d.extras.pattern.trim() || C.blind.noCall}</span>
              </div>
              <div>
                <span className="font-mono text-[11.5px] tracking-[0.14em] text-dim uppercase">{C.blind.itWas}</span>
                <span
                  className="iv-reveal-word font-display caps flex items-center gap-3"
                  style={{ color: patternMatches(d.extras.pattern, problem.topic) ? 'var(--verdict-ac)' : 'var(--verdict-wa)' }}
                >
                  {problem.topic}
                  {patternMatches(d.extras.pattern, problem.topic) ? (
                    <Icon name="check" size={26} stroke={3} />
                  ) : (
                    <Icon name="close" size={26} stroke={3} />
                  )}
                </span>
              </div>
            </div>
          )}
          {d.extras.curveAsked && (
            <div className="iv-curve">
              <span className="font-mono text-[12px] tracking-[0.14em] text-gold uppercase">{C.curveball}</span>
              <p className="m-0 text-[16px] leading-[1.5] text-text">{d.extras.curveball}</p>
              {d.extras.curveAnswer.trim() ? (
                <pre className="iv-pre m-0">{d.extras.curveAnswer}</pre>
              ) : (
                <p className="m-0 text-[14px] text-muted">No written answer.</p>
              )}
            </div>
          )}
        </section>
      )}

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

      <section className="panel flex flex-col gap-4 p-5 lg:p-7" aria-labelledby="calib-title">
        <div className="flex flex-col gap-1.5">
          <h3 id="calib-title" className="font-display caps m-0 text-[30px] leading-[0.95] font-black">
            {C.calib.title}
          </h3>
          <p className="m-0 text-[14px] text-muted">{debrief ? C.calib.leadAi : C.calib.leadSignals}</p>
        </div>
        {!record.scores ? (
          <p className="m-0 text-[14.5px] text-soft">{C.calib.locked}</p>
        ) : !calib ? (
          <p className="m-0 text-[14.5px] text-soft">{C.calib.noYardstick}</p>
        ) : (
          <>
            <table className="iv-table iv-calib">
              <thead>
                <tr>
                  <th scope="col" />
                  <th scope="col">{C.calib.you}</th>
                  <th scope="col">{debrief ? C.calib.ai : C.calib.signals}</th>
                  <th scope="col">{C.calib.gap}</th>
                </tr>
              </thead>
              <tbody>
                {calib.map((c) => (
                  <tr key={c.key}>
                    <th scope="row">{RUBRIC.find((r) => r.key === c.key)!.title}</th>
                    <td>{c.self}</td>
                    <td>{c.bench}</td>
                    <td data-gap={c.gap > 0 ? 'over' : c.gap < 0 ? 'under' : 'even'}>{c.gap > 0 ? `+${c.gap}` : c.gap}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(() => {
              const worst = calib.reduce((a, b) => (Math.abs(b.gap) > Math.abs(a.gap) ? b : a));
              const title = RUBRIC.find((r) => r.key === worst.key)!.title;
              const by = `${Math.abs(worst.gap)} point${Math.abs(worst.gap) === 1 ? '' : 's'}`;
              return (
                <p className="m-0 text-[15px] leading-[1.5] text-soft">
                  {worst.gap === 0 ? C.calib.even : worst.gap > 0 ? C.calib.over(title, by) : C.calib.under(title, by)}
                </p>
              );
            })()}
          </>
        )}
      </section>

      <section id="review-transcript" className="panel flex flex-col gap-4 p-5 lg:p-7" aria-label={R.yourNotes}>
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
        <Transcript lines={d.transcript} focus={focus} />
      </section>
    </div>
  );
}
