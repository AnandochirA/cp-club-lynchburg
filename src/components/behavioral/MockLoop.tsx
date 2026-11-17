'use client';

import { useMemo, useState } from 'react';
import { band } from '@/lib/bh/answer';
import type { BehavioralRound, Persona } from '@/lib/bh/model';
import { type BQuestion, SCRIPTS, qtypeTitle, questionById, questionsFor } from '@/lib/bh/questions';
import { SIGNAL_KEYS, type SignalKey, signalByKey } from '@/lib/bh/signals';
import type { Shared } from './BehavioralStudio';
import { Round } from './Round';
import { Arrow, Btn, Eyebrow, Grade, H2, mmss } from './ui';

type Done = { q: BQuestion; round: BehavioralRound };

/** Questions for a loop built from what your catalog does not cover yet. */
function gapLoop(level: Shared['state']['profile']['level'], gaps: SignalKey[]): BQuestion[] {
  const bank = questionsFor(level);
  const take = (id: string) => questionById(id)!;
  const out = [take('tmay'), take('proj-favorite'), take('conf-resolved')];
  const want = gaps.length ? gaps : SIGNAL_KEYS.filter((k) => k !== 'scope' && k !== 'conflict');
  for (const k of want.slice(0, 4)) {
    const pool = bank.filter((q) => q.type === 'time' && !q.big && q.signals[0] === k && !out.includes(q));
    if (pool.length) out.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  const other = bank.filter((q) => (q.type === 'values' || q.type === 'hypo') && !out.includes(q));
  if (other.length) out.push(other[Math.floor(Math.random() * other.length)]);
  return out;
}

/**
 * A mock interview: one of the book's three scripts or a loop built from your
 * gaps, with an interviewer persona, then a report the way an interviewer's
 * write-up would read: signal coverage, stories reused, pacing.
 */
export function MockLoop({ state, path, go, setFocus, now, refresh, onBack }: Shared & { onBack: () => void }) {
  const [script, setScript] = useState<string>('script-1');
  const [persona, setPersona] = useState<Persona>('conversationalist');
  const [run, setRun] = useState<{ qs: BQuestion[]; loopId: string; script: string } | null>(null);
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState<Done[]>([]);
  const [report, setReport] = useState(false);

  const used = useMemo(() => {
    const m = new Map<number, number>();
    for (const d of done) if (d.round.storyId) m.set(d.round.storyId, (m.get(d.round.storyId) ?? 0) + 1);
    return m;
  }, [done]);

  const start = () => {
    const base = script === 'gaps' ? gapLoop(state.profile.level, path.coverage.gaps) : SCRIPTS.find((s) => s.id === script)!.questions.map((id) => questionById(id)!);
    setRun({ qs: [...base, questionById('ask-end')!], loopId: `L${Date.now().toString(36)}`, script: script === 'gaps' ? '' : script });
    setIdx(0);
    setDone([]);
    setReport(false);
    setFocus(true);
  };
  const stop = () => {
    setFocus(false);
    setRun(null);
    void refresh();
  };

  if (run && !report) {
    const q = run.qs[idx];
    const last = idx + 1 >= run.qs.length;
    return (
      <Round
        key={`${run.loopId}-${idx}`}
        question={q}
        stories={state.stories}
        profile={state.profile}
        kind="loop"
        select
        persona={persona}
        used={used}
        nth={idx}
        loopId={run.loopId}
        script={run.script}
        label={`Question ${idx + 1} of ${run.qs.length}`}
        nextLabel={last ? 'See the report' : 'Next question'}
        now={now}
        go={go}
        onSaved={(r) => setDone((d) => [...d, { q, round: r }])}
        onNext={() => (last ? (setReport(true), setFocus(false), void refresh()) : setIdx(idx + 1))}
        onExit={() => (done.length ? (setReport(true), setFocus(false), void refresh()) : stop())}
      />
    );
  }

  if (run && report) {
    const total = done.reduce((n, d) => n + d.round.durationMs + d.round.probes.reduce((m, p) => m + p.durationMs, 0), 0) / 1000;
    const covered = new Set(done.filter((d) => d.round.score >= 50 && d.q.type !== 'tmay' && d.q.type !== 'ask').flatMap((d) => d.q.signals));
    const told = done.filter((d) => d.round.storyId).map((d) => d.round.storyId!);
    const repeats = told.length - new Set(told).size;
    const sel = done.filter((d) => d.round.selection);
    const selAvg = sel.length ? sel.reduce((n, d) => n + d.round.selection!.ms, 0) / sel.length / 1000 : 0;
    const long = done.filter((d) => d.round.durationMs / 1000 > band(d.q.type)[1]);
    const avg = done.length ? Math.round(done.reduce((n, d) => n + d.round.score, 0) / done.length) : 0;
    return (
      <section className="panel flex flex-col gap-6 p-5 lg:p-8" aria-labelledby="lr-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <Eyebrow>
              Mock loop · {persona === 'examiner' ? 'Examiner' : 'Conversationalist'} · {done.length}/{run.qs.length} answered
            </Eyebrow>
            <H2 id="lr-title">The write-up</H2>
          </div>
          <span className="bh-score bh-score-lg font-display">{avg}</span>
        </div>
        <ul className="iv-signals m-0 list-none p-0">
          <li className="iv-signal" data-grade={covered.size >= 5 ? 'good' : covered.size >= 3 ? 'ok' : 'bad'}>
            <span className="iv-signal-label font-mono">Signal areas landed</span>
            <span className="iv-signal-value font-display">{covered.size}/8</span>
            <span className="iv-signal-target font-mono">5–7 is a healthy interview</span>
          </li>
          <li className="iv-signal" data-grade={long.length === 0 ? 'good' : long.length <= 2 ? 'ok' : 'bad'}>
            <span className="iv-signal-label font-mono">Over-long answers</span>
            <span className="iv-signal-value font-display">{long.length}</span>
            <span className="iv-signal-target font-mono">long answers crowd out questions</span>
          </li>
          <li className="iv-signal" data-grade={repeats === 0 ? 'good' : repeats <= 1 ? 'ok' : 'bad'}>
            <span className="iv-signal-label font-mono">Stories repeated</span>
            <span className="iv-signal-value font-display">{repeats}</span>
            <span className="iv-signal-target font-mono">{new Set(told).size} different stories told</span>
          </li>
          {sel.length > 0 && (
            <li className="iv-signal" data-grade={selAvg <= 15 ? 'good' : selAvg <= 25 ? 'ok' : 'bad'}>
              <span className="iv-signal-label font-mono">Time to pick a story</span>
              <span className="iv-signal-value font-display">{Math.round(selAvg)}s</span>
              <span className="iv-signal-target font-mono">15s or less</span>
            </li>
          )}
          <li className="iv-signal" data-grade="ok">
            <span className="iv-signal-label font-mono">Talk time</span>
            <span className="iv-signal-value font-display">{mmss(total)}</span>
            <span className="iv-signal-target font-mono">a real round is 45 minutes</span>
          </li>
        </ul>
        {covered.size < 8 && (
          <p className="m-0 text-[14.5px] text-muted">
            Not landed this time: {SIGNAL_KEYS.filter((k) => !covered.has(k)).map((k) => signalByKey(k).title).join(', ')}.
          </p>
        )}
        <ol className="m-0 flex flex-col gap-2 pl-5">
          {done.map((d, i) => (
            <li key={i} className="text-[14.5px] text-soft">
              <span className="text-text">{d.q.text}</span>{' '}
              <span className="font-mono text-[12px] text-dim">
                {qtypeTitle(d.q.type)} · {mmss(d.round.durationMs / 1000)}
                {d.round.storyId && ` · ${state.stories.find((s) => s.id === d.round.storyId)?.title ?? 'story'}`}
              </span>{' '}
              <Grade grade={d.round.score >= 70 ? 'good' : d.round.score >= 45 ? 'ok' : 'bad'}>{d.round.score}</Grade>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-3">
          <Btn onClick={start}>
            Run another <Arrow />
          </Btn>
          <button type="button" className="iv-link" onClick={stop}>
            Done
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="panel flex flex-col gap-5 p-5 lg:p-8" aria-labelledby="ml-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Eyebrow>Mock interview</Eyebrow>
          <H2 id="ml-title">Mock loop</H2>
        </div>
        <button type="button" className="iv-link" onClick={onBack}>
          Back
        </button>
      </div>
      <p className="m-0 max-w-[66ch] text-[14.5px] leading-[1.55] text-soft">
        A full interview, question after question. You pick a story for each (no signal-spotting help) and it ends with your questions for them. Each script covers the signal areas the way a real hiring manager&apos;s list does.
      </p>
      <div className="flex flex-col gap-2">
        <Eyebrow>Questions</Eyebrow>
        <div className="flex flex-wrap gap-2">
          {SCRIPTS.map((s) => (
            <button key={s.id} type="button" className="iv-chip-btn" data-on={script === s.id ? '1' : undefined} onClick={() => setScript(s.id)}>
              {s.title}
              {state.stats.scripts.includes(s.id) && ' ✓'}
            </button>
          ))}
          <button type="button" className="iv-chip-btn" data-on={script === 'gaps' ? '1' : undefined} onClick={() => setScript('gaps')}>
            Built from my gaps
          </button>
        </div>
        <ol className="m-0 flex flex-col gap-1 pl-5 text-[14px] text-muted">
          {(script === 'gaps' ? ['Tell me about yourself', 'Favorite project', 'A conflict', ...path.coverage.gaps.slice(0, 4).map((k) => `A ${signalByKey(k).title} question`), 'A values or hypothetical question'] : SCRIPTS.find((s) => s.id === script)!.questions.map((id) => questionById(id)!.text)).map((t, i) => (
            <li key={i}>{t}</li>
          ))}
          <li>What questions do you have for me?</li>
        </ol>
      </div>
      <div className="flex flex-col gap-2">
        <Eyebrow>Interviewer</Eyebrow>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="iv-chip-btn" data-on={persona === 'conversationalist' ? '1' : undefined} onClick={() => setPersona('conversationalist')}>
            Conversationalist: lets you talk, two follow-ups
          </button>
          <button type="button" className="iv-chip-btn" data-on={persona === 'examiner' ? '1' : undefined} onClick={() => setPersona('examiner')}>
            Examiner: brisk, cuts in at 1:15
          </button>
        </div>
      </div>
      <Btn onClick={start} disabled={state.stories.length === 0}>
        Start the loop <Arrow />
      </Btn>
      {state.stories.length === 0 && <p className="m-0 text-[13.5px] text-dim">Add a few stories to your catalog first. A mock loop is for testing the catalog.</p>}
    </section>
  );
}
