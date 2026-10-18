'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiErrors } from '@/lib/content';
import { apiPost } from '@/lib/client-api';
import {
  ANSWER_MAX_S,
  ANSWER_TARGET,
  GENERAL_PROBES,
  PROBE_MAX_S,
  STAR,
  THINK_S,
  behavioralCopy as B,
  behavioralErrors,
  competencyByKey,
  type Question,
} from '@/lib/behavioral-kit';
import { answerMetrics, answerSignals, type BehavioralRound, type RoundInput, type Star, type Story } from '@/lib/behavioral-logic';
import { pick } from '@/lib/interview-logic';
import { Icon } from '../icons';
import { useSpeech } from '../interview/useSpeech';

type Phase = 'think' | 'answer' | 'probe' | 'check' | 'done';
const NO_STAR: Star = { s: false, t: false, a: false, r: false };
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/**
 * One question (or a loop of three): the question is read out, thirty
 * seconds to think, the answer against a timer whose green band is the
 * length interviewers like, a follow-up probe, then the signals and a STAR
 * self-check. Each answer is saved as soon as it is checked.
 */
export function Round({
  questions,
  stories,
  onSaved,
  onExit,
}: {
  questions: Question[];
  stories: Story[];
  onSaved: (r: BehavioralRound) => void;
  onExit: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('think');
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [answer, setAnswer] = useState<string[]>([]);
  const [probeLines, setProbeLines] = useState<string[]>([]);
  const [probe, setProbe] = useState('');
  const [answerMs, setAnswerMs] = useState(0);
  const [star, setStar] = useState<Star>(NO_STAR);
  const [storyId, setStoryId] = useState<number | null>(null);
  const [mic, setMic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<BehavioralRound[]>([]);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const q = questions[idx];
  const comp = competencyByKey(q.competency);
  const mine = stories.filter((s) => s.tags.includes(q.competency));

  const speech = useSpeech({
    onFinal: (t) => {
      if (phaseRef.current === 'answer') setAnswer((a) => [...a, t]);
      else if (phaseRef.current === 'probe') setProbeLines((a) => [...a, t]);
    },
    onHeard: () => {},
  });
  const { say, listen } = speech;

  // Read each question out as it comes up.
  const asked = useRef(-1);
  useEffect(() => {
    if (asked.current === idx) return;
    asked.current = idx;
    setStartedAt(Date.now());
    void say(questions.length > 1 ? `Question ${idx + 1}. ${q.text}` : q.text);
  }, [idx, q.text, questions.length, say]);

  const toAnswer = useCallback(() => {
    setPhase('answer');
    setStartedAt(Date.now());
    if (speech.stt) {
      listen(true);
      setMic(true);
    }
  }, [listen, speech.stt]);

  const toProbe = useCallback(() => {
    setAnswerMs(Date.now() - startedAt);
    const p = pick([...comp.probes, ...GENERAL_PROBES]);
    setProbe(p);
    setPhase('probe');
    setStartedAt(Date.now());
    void say(p);
  }, [comp.probes, say, startedAt]);

  const toCheck = useCallback(() => {
    listen(false);
    setPhase('check');
  }, [listen]);

  useEffect(() => {
    if (phase === 'check' || phase === 'done') return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [phase]);

  const elapsed = Math.max(0, (now - startedAt) / 1000);
  useEffect(() => {
    if (phase === 'think' && elapsed >= THINK_S) toAnswer();
    if (phase === 'answer' && elapsed >= ANSWER_MAX_S) toProbe();
    if (phase === 'probe' && elapsed >= PROBE_MAX_S) toCheck();
  }, [phase, elapsed, toAnswer, toProbe, toCheck]);

  useEffect(() => () => listen(false), [listen]);

  const input: RoundInput = { questionId: q.id, storyId, answer, probe: probeLines, durationMs: answerMs, mic, star };
  const signals = answerSignals(answerMetrics(input));

  async function save() {
    setSaving(true);
    setError(null);
    const res = await apiPost<{ round: BehavioralRound }>('/api/behavioral/rounds', input);
    setSaving(false);
    if (!res.ok) return setError(behavioralErrors[res.error] ?? apiErrors[res.error] ?? apiErrors.server);
    onSaved(res.data.round);
    setDone((d) => [...d, res.data.round]);
    if (idx + 1 < questions.length) {
      setAnswer([]);
      setProbeLines([]);
      setStar(NO_STAR);
      setStoryId(null);
      setPhase('think');
      setIdx(idx + 1);
    } else {
      setPhase('done');
    }
  }

  if (phase === 'done') {
    return (
      <section className="panel flex flex-col gap-5 p-5 lg:p-8" aria-labelledby="loop-title">
        <span className="eyebrow-m">{questions.length > 1 ? B.loopDone : B.check}</span>
        <h2 id="loop-title" className="font-display caps m-0 text-[48px] leading-[0.88] font-black lg:text-[64px]">
          {questions.length > 1 ? `${questions.length} for ${questions.length}` : 'Saved'}
        </h2>
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {done.map((r, i) => {
            const qq = questions[i];
            const sig = r.metrics ? answerSignals(r.metrics) : [];
            return (
              <li key={r.id} className="flex flex-col gap-2 border-t border-white/8 pt-3">
                <span className="font-mono text-[11.5px] tracking-[0.12em] text-dim uppercase">{competencyByKey(qq.competency).title}</span>
                <span className="text-[16px] text-text">{qq.text}</span>
                <span className="flex flex-wrap gap-2">
                  {sig.map((s) => (
                    <span key={s.key} className="bh-pill font-mono" data-grade={s.grade}>
                      {s.label}: {s.value}
                    </span>
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap gap-4">
          <button type="button" onClick={onExit} className="btn btn-primary flex h-12 cursor-pointer items-center gap-2 rounded-none border-0 px-6 font-sans text-[15px] font-semibold text-white">
            {B.backToMenu}
          </button>
        </div>
      </section>
    );
  }

  const [lo, hi] = ANSWER_TARGET;
  const max = phase === 'probe' ? PROBE_MAX_S : ANSWER_MAX_S;
  const zone = phase !== 'answer' ? 'none' : elapsed < lo ? 'early' : elapsed <= hi ? 'good' : elapsed < ANSWER_MAX_S - 20 ? 'long' : 'over';

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <section className="panel bh-q flex flex-col gap-5 p-5 lg:p-8" aria-labelledby="bh-q">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="eyebrow-m">
            {comp.title}
            {questions.length > 1 && ` · ${B.question(idx + 1, questions.length)}`}
          </span>
          <button type="button" className="iv-link" onClick={() => { listen(false); speech.hush(); onExit(); }}>
            {B.backToMenu}
          </button>
        </div>
        <blockquote id="bh-q" className="bh-quote font-display m-0" key={q.id}>
          {q.text}
        </blockquote>
        <button type="button" className="iv-link w-fit" onClick={() => void say(q.text)}>
          Say it again
        </button>
      </section>

      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}

      {phase === 'think' && (
        <section className="panel flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:gap-10 lg:p-8" aria-label={B.think}>
          <div className="bh-ring" style={{ ['--p' as string]: Math.min(1, elapsed / THINK_S) }} role="timer" aria-label={`${Math.ceil(THINK_S - elapsed)} seconds to think`}>
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="52" />
              <circle cx="60" cy="60" r="52" className="bh-ring-fill" />
            </svg>
            <span className="font-display">{Math.max(0, Math.ceil(THINK_S - elapsed))}</span>
          </div>
          <div className="flex flex-grow flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <h2 className="font-display caps m-0 text-[34px] leading-[0.9] font-black">{B.think}</h2>
              <p className="m-0 text-[15px] leading-[1.5] text-soft">{B.thinkNote}</p>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[12px] tracking-[0.1em] text-dim uppercase">{B.yourStories}</span>
              {mine.length === 0 ? (
                <p className="m-0 text-[14px] text-muted">{B.noStories}</p>
              ) : (
                <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                  {mine.map((s) => (
                    <li key={s.id} className="bh-story-cue">
                      <b>{s.title}</b>
                      {s.result && <span className="text-muted"> → {s.result}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button type="button" onClick={toAnswer} className="btn btn-primary [clip-path:polygon(0_0,calc(100%-10px)_0,100%_10px,100%_100%,0_100%)] flex h-12 w-fit cursor-pointer items-center gap-2.5 rounded-none border-0 px-6 font-sans text-[15px] font-semibold text-white">
              <span className="sheen" aria-hidden="true" />
              {B.ready}
              <Icon name="arrow" size={17} stroke={2.2} className="arrow" />
            </button>
          </div>
        </section>
      )}

      {(phase === 'answer' || phase === 'probe') && (
        <section className="panel flex flex-col gap-5 p-5 lg:p-8" aria-label={phase === 'answer' ? B.answer : B.probe}>
          {phase === 'probe' && (
            <figure className="iv-coach m-0" data-speaking={speech.speaking ? '1' : undefined}>
              <figcaption className="font-mono flex items-center gap-2 text-[11.5px] tracking-[0.14em] text-white/55 uppercase">
                <i className="iv-wave" aria-hidden="true">
                  <b />
                  <b />
                  <b />
                </i>
                {B.probe}
              </figcaption>
              <blockquote className="m-0 text-[18px] leading-[1.5] text-text">{probe}</blockquote>
            </figure>
          )}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[12px] tracking-[0.12em] text-dim uppercase">{phase === 'answer' ? B.answer : B.probe}</span>
              <span className="bh-clock font-display" data-zone={zone}>
                {mmss(elapsed)}
              </span>
            </div>
            {phase === 'answer' && <p className="m-0 max-w-[40ch] text-[14px] leading-[1.5] text-muted">{B.answerNote}</p>}
          </div>
          {/* The track: 0 to the hard stop, with the green band where a good answer ends. */}
          <div className="bh-track" aria-hidden="true">
            {phase === 'answer' && <span className="bh-band" style={{ left: `${(lo / max) * 100}%`, width: `${((hi - lo) / max) * 100}%` }} />}
            <span className="bh-fill" data-zone={zone} style={{ width: `${Math.min(100, (elapsed / max) * 100)}%` }} />
            {phase === 'answer' && (
              <>
                <span className="bh-tick font-mono" style={{ left: `${(lo / max) * 100}%` }}>
                  {mmss(lo)}
                </span>
                <span className="bh-tick font-mono" style={{ left: `${(hi / max) * 100}%` }}>
                  {mmss(hi)}
                </span>
              </>
            )}
          </div>
          <div className="bh-live" aria-live="polite">
            {(phase === 'answer' ? answer : probeLines).join(' ')}
            {speech.interim && <span className="text-dim"> {speech.interim}</span>}
            {!speech.stt && <span className="text-muted">Talk out loud anyway; this browser can’t transcribe.</span>}
          </div>
          {speech.denied && <p className="notice">The microphone is blocked. Allow it in the address bar to get the full signals.</p>}
          <button
            type="button"
            onClick={phase === 'answer' ? toProbe : toCheck}
            className="btn btn-primary [clip-path:polygon(0_0,calc(100%-10px)_0,100%_10px,100%_100%,0_100%)] flex h-12 w-fit cursor-pointer items-center gap-2.5 rounded-none border-0 px-6 font-sans text-[15px] font-semibold text-white"
          >
            <span className="sheen" aria-hidden="true" />
            {phase === 'answer' ? B.doneAnswering : B.doneProbe}
          </button>
        </section>
      )}

      {phase === 'check' && (
        <section className="panel flex flex-col gap-6 p-5 lg:p-8" aria-label={B.check}>
          <h2 className="font-display caps m-0 text-[40px] leading-[0.9] font-black">{B.check}</h2>
          <ul className="iv-signals m-0 list-none p-0">
            {signals.map((s, i) => (
              <li key={s.key} className="iv-signal" data-grade={s.grade} style={{ ['--n' as string]: i }}>
                <span className="iv-signal-label font-mono">{s.label}</span>
                <span className="iv-signal-value font-display">{s.value}</span>
                <span className="iv-signal-target font-mono">target {s.target}</span>
              </li>
            ))}
          </ul>
          {!mic && <p className="m-0 text-[14px] text-muted">{B.noMic}</p>}

          <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
            <legend className="mb-2 p-0 text-[17px] font-semibold text-text">{B.starCheck}</legend>
            <div className="bh-star">
              {STAR.map((b) => (
                <label key={b.key} className="bh-star-beat">
                  <input type="checkbox" checked={star[b.key]} onChange={() => setStar((s) => ({ ...s, [b.key]: !s[b.key] }))} />
                  <span>
                    <b className="font-display">{b.key.toUpperCase()}</b>
                    <i>{b.title}</i>
                    <small>{b.hint}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="flex flex-col gap-2">
            <span className="text-[17px] font-semibold text-text">{B.usedStory}</span>
            <select className="iv-input" value={storyId ?? ''} onChange={(e) => setStoryId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">{B.noStoryUsed}</option>
              {stories.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>

          {answer.length > 0 && (
            <details className="bh-details">
              <summary className="font-mono">What you said</summary>
              <p className="m-0 text-[14.5px] leading-[1.6] text-soft">{answer.join(' ')}</p>
              {probeLines.length > 0 && <p className="m-0 mt-3 text-[14.5px] leading-[1.6] text-muted">Follow-up: {probeLines.join(' ')}</p>}
            </details>
          )}

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="btn btn-primary [clip-path:polygon(0_0,calc(100%-10px)_0,100%_10px,100%_100%,0_100%)] flex h-13 w-fit cursor-pointer items-center gap-2.5 rounded-none border-0 px-7 font-sans text-[15.5px] font-semibold text-white"
          >
            <span className="sheen" aria-hidden="true" />
            {saving ? B.saving : idx + 1 < questions.length ? `${B.save} · ${B.nextQuestion}` : questions.length > 1 ? `${B.save} · ${B.finishLoop}` : B.save}
            <Icon name="arrow" size={17} stroke={2.2} className="arrow" />
          </button>
        </section>
      )}
    </div>
  );
}
