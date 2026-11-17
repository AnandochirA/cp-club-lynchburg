'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiErrors } from '@/lib/content';
import { apiPost } from '@/lib/client-api';
import {
  BEATS,
  type Beat,
  type BeatMark,
  type Probe,
  type Segment,
  answerChecks,
  answerMetrics,
  answerScore,
  band,
  branchProbe,
  leafProbe,
  probeChecks,
} from '@/lib/bh/answer';
import { judgeSelection, rankStories, type Verdict } from '@/lib/bh/catalog';
import { HYPO_STEPS, VALUES_STEPS, VALUE_PATTERNS } from '@/lib/bh/kit';
import type { BehavioralRound, Persona, Profile, ProbeTake, RoundInput, RoundKind } from '@/lib/bh/model';
import { cardByKey } from '@/lib/bh/playbook';
import { type BQuestion, QTYPES, behind, qtypeTitle } from '@/lib/bh/questions';
import { SIGNALS, type SignalKey, signalByKey } from '@/lib/bh/signals';
import type { Story } from '@/lib/bh/story';
import { useSpeech } from '../interview/useSpeech';
import { Arrow, Btn, ConceptLink, Eyebrow, type Go, Grade, SignalTags, bhErrors, mmss } from './ui';

type Phase = 'decode' | 'select' | 'think' | 'answer' | 'probe' | 'check' | 'saved';
const THINK_S = 30;
const DECODE_S = 10;
const SELECT_S = 15;
const EXAMINER_CUT_S = 75;

export type RoundProps = {
  question: BQuestion;
  stories: Story[];
  profile: Profile;
  kind: RoundKind;
  /** Rehearsal: the story being told. */
  story?: Story;
  decode?: boolean;
  select?: boolean;
  persona?: Persona;
  /** Stories already told in this interview (for the uniqueness part of selection). */
  used?: ReadonlyMap<number, number>;
  nth?: number;
  loopId?: string;
  script?: string;
  label?: string;
  nextLabel?: string;
  now: Date;
  go: (g: Go) => void;
  onSaved: (r: BehavioralRound) => void;
  onNext: () => void;
  onExit: () => void;
};

/**
 * One question, the way the book breaks it down: Decode (which signal areas?),
 * Select (which story, fast?), then Deliver out loud while tapping the CARL
 * beats, then follow-ups aimed at the weak spots, then the checks.
 */
export function Round(props: RoundProps) {
  const { question: q, stories, profile, kind, persona = 'none', used = new Map(), nth = 0, now, go } = props;
  const isStoryQ = q.type === 'time' || q.type === 'values' || q.type === 'hypo';
  const first: Phase = props.decode && (q.type === 'time' || q.type === 'values' || q.type === 'hypo') ? 'decode' : props.select && isStoryQ && stories.length ? 'select' : 'think';
  const [phase, setPhase] = useState<Phase>(first);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [segments, setSegments] = useState<Segment[]>([]);
  const [beats, setBeats] = useState<BeatMark[]>([]);
  const [answerMs, setAnswerMs] = useState(0);
  const [probes, setProbes] = useState<Probe[]>([]);
  const [pi, setPi] = useState(0);
  const [takes, setTakes] = useState<ProbeTake[]>([]);
  const [probeLines, setProbeLines] = useState<Segment[]>([]);
  const [mic, setMic] = useState(false);
  const [decode, setDecode] = useState<{ picked: SignalKey[]; type: BQuestion['type'] | null; done: boolean; correct: boolean }>({ picked: [], type: null, done: false, correct: false });
  const [pick, setPick] = useState<{ id: number | null; ms: number; verdict: Verdict } | null>(null);
  const [clar, setClar] = useState<{ asked: number[]; heard: string | null }>({ asked: [], heard: null });
  const [record, setRecord] = useState(false);
  const [audio, setAudio] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interrupted, setInterrupted] = useState(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const startRef = useRef(startedAt);
  startRef.current = startedAt;
  const rec = useRef<{ mr: MediaRecorder; chunks: Blob[]; stream: MediaStream } | null>(null);

  const story = props.story ?? (pick?.id ? stories.find((s) => s.id === pick.id) : undefined);
  const ranked = useMemo(() => rankStories(q.signals, stories, used, nth, now), [q.signals, stories, used, nth, now]);

  const speech = useSpeech({
    onFinal: (text) => {
      const t = Date.now() - startRef.current;
      if (phaseRef.current === 'answer') setSegments((a) => [...a, { t, text }]);
      else if (phaseRef.current === 'probe') setProbeLines((a) => [...a, { t, text }]);
    },
    onHeard: () => {},
  });
  const { say, listen, hush } = speech;

  // Read the question out once.
  const asked = useRef(false);
  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    void say(props.label ? `${props.label}. ${q.text}` : q.text);
  }, [q.text, props.label, say]);

  useEffect(() => {
    if (phase === 'check' || phase === 'saved') return;
    const id = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(
    () => () => {
      listen(false);
      rec.current?.stream.getTracks().forEach((t) => t.stop());
    },
    [listen],
  );
  useEffect(() => () => void (audio && URL.revokeObjectURL(audio)), [audio]);

  const elapsed = Math.max(0, (nowMs - startedAt) / 1000);
  const restart = () => {
    const t = Date.now();
    setStartedAt(t);
    startRef.current = t;
    setNowMs(t);
  };

  // ---------------------------------------------------------------- phase moves
  const toThink = useCallback(() => {
    setPhase('think');
    restart();
  }, []);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      mr.onstop = () => {
        setAudio(URL.createObjectURL(new Blob(chunks, { type: mr.mimeType || 'audio/webm' })));
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      rec.current = { mr, chunks, stream };
    } catch {
      setRecord(false);
    }
  }
  const stopRecording = () => {
    if (rec.current && rec.current.mr.state !== 'inactive') rec.current.mr.stop();
    rec.current = null;
  };

  const toAnswer = useCallback(() => {
    setPhase('answer');
    restart();
    setBeats(q.type === 'tmay' || q.type === 'ask' ? [] : [{ b: 'c', t: 0 }]);
    if (speech.stt) {
      listen(true);
      setMic(true);
    }
    if (record) void startRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listen, speech.stt, record, q.type]);

  const finishAnswer = useCallback(
    (cut: boolean) => {
      const ms = Date.now() - startRef.current;
      setAnswerMs(ms);
      const m = answerMetrics({ qtype: q.type, signals: q.signals, segments, beats, durationMs: ms, mic, clarifiers: { asked: clar.asked.length, good: clar.asked.filter((i) => q.clarifiers?.[i]?.good).length } });
      const leaf = leafProbe(m, q.type, q.signals);
      let list: Probe[] = [];
      if (kind === 'question' || kind === 'loop') {
        if (q.type === 'time') list = persona === 'examiner' ? [leaf] : [branchProbe(q.signals, story?.followups ?? [], q.id.length + segments.length), leaf];
        else if (q.type === 'values' || q.type === 'hypo') list = [leaf];
      }
      if (list.length === 0) {
        listen(false);
        stopRecording();
        setPhase('check');
        return;
      }
      setProbes(list);
      setPi(0);
      setProbeLines([]);
      setPhase('probe');
      restart();
      void say(cut ? `Let me stop you there. ${list[0].text}` : list[0].text);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [segments, beats, mic, clar, q, kind, persona, story, say, listen],
  );

  const finishProbe = useCallback(() => {
    const take: ProbeTake = { text: probes[pi].text, level: probes[pi].level, lines: probeLines, durationMs: Date.now() - startRef.current };
    setTakes((t) => [...t, take]);
    if (pi + 1 < probes.length) {
      setPi(pi + 1);
      setProbeLines([]);
      restart();
      void say(probes[pi + 1].text);
      return;
    }
    listen(false);
    stopRecording();
    setPhase('check');
  }, [probes, pi, probeLines, say, listen]);

  // Timers: decode and select are soft; answers have hard stops; the examiner cuts in.
  const [lo, hi, max] = band(q.type);
  useEffect(() => {
    if (phase === 'think' && elapsed >= THINK_S) toAnswer();
    if (phase === 'answer') {
      if (persona === 'examiner' && q.type === 'time' && kind !== 'rehearse' && elapsed >= EXAMINER_CUT_S && !interrupted) {
        setInterrupted(true);
        finishAnswer(true);
      } else if (elapsed >= max) finishAnswer(false);
    }
    if (phase === 'probe') {
      const p = probes[pi];
      if (p && elapsed >= (p.level === 'leaf' ? 45 : 120)) finishProbe();
    }
  }, [phase, elapsed, toAnswer, finishAnswer, finishProbe, max, persona, q.type, kind, interrupted, probes, pi]);

  // Beat keys while answering: 1–4 or C/A/R/L.
  const tap = useCallback(
    (b: Beat) => {
      if (phaseRef.current !== 'answer') return;
      setBeats((xs) => (xs.length && xs[xs.length - 1].b === b ? xs : [...xs, { b, t: Date.now() - startRef.current }]));
    },
    [],
  );
  useEffect(() => {
    if (phase !== 'answer' || q.type === 'tmay' || q.type === 'ask') return;
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const b = ({ '1': 'c', '2': 'a', '3': 'r', '4': 'l', c: 'c', a: 'a', r: 'r', l: 'l' } as Record<string, Beat>)[k];
      if (b) tap(b);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, q.type, tap]);

  // ---------------------------------------------------------------- results
  const clarifiers = { asked: clar.asked.length, good: clar.asked.filter((i) => q.clarifiers?.[i]?.good).length };
  const metrics = useMemo(
    () => answerMetrics({ qtype: q.type, signals: q.signals, segments, beats, durationMs: answerMs, mic, clarifiers }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q, segments, beats, answerMs, mic, clar],
  );
  const checks = useMemo(() => [...answerChecks(metrics, q.type, q.signals), ...probeChecks(takes)], [metrics, q, takes]);
  const score = answerScore(checks);

  const input: RoundInput = {
    kind,
    questionId: q.id,
    qtype: q.type,
    storyId: story?.id ?? null,
    segments,
    probes: takes,
    durationMs: answerMs,
    mic,
    beats,
    selection: pick ? { pickedId: pick.id, ms: pick.ms, grade: pick.verdict.grade } : null,
    decode: decode.done ? { picked: decode.picked, type: decode.type, correct: decode.correct } : null,
    clarifiers,
    persona,
    loopId: props.loopId ?? '',
    script: props.script ?? '',
  };

  async function save() {
    setSaving(true);
    setError(null);
    const res = await apiPost<{ round: BehavioralRound }>('/api/behavioral/rounds', input);
    setSaving(false);
    if (!res.ok) return setError(bhErrors[res.error] ?? apiErrors[res.error] ?? apiErrors.server);
    props.onSaved(res.data.round);
    setPhase('saved');
  }

  const exit = () => {
    listen(false);
    hush();
    stopRecording();
    props.onExit();
  };

  // ---------------------------------------------------------------- view
  const zone = phase !== 'answer' ? 'none' : elapsed < lo ? 'early' : elapsed <= hi ? 'good' : elapsed < max - 20 ? 'long' : 'over';
  const curBeat = beats.length ? beats[beats.length - 1].b : null;

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <section className="panel bh-q flex flex-col gap-4 p-5 lg:p-8" aria-labelledby="bh-q">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="eyebrow-m">
            {props.label ?? qtypeTitle(q.type)}
            {persona !== 'none' && ` · ${persona === 'examiner' ? 'Examiner' : 'Conversationalist'}`}
          </span>
          <button type="button" className="iv-link" onClick={exit}>
            Exit
          </button>
        </div>
        <blockquote id="bh-q" className="bh-quote font-display m-0" key={q.id}>
          {q.text}
        </blockquote>
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" className="iv-link w-fit" onClick={() => void say(q.text)}>
            Say it again
          </button>
          {phase !== 'decode' && <SignalTags keys={q.signals} />}
        </div>
      </section>

      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}

      {phase === 'decode' && (
        <section className="panel flex flex-col gap-5 p-5 lg:p-8" aria-label="Decode">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <Eyebrow>Step 1 · Decode</Eyebrow>
              <span className="text-[18px] font-semibold text-text">What is this question really scoring?</span>
            </div>
            <span className="bh-clock font-display" data-zone={elapsed <= DECODE_S ? 'good' : 'long'}>
              {mmss(elapsed)}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <Eyebrow>Type</Eyebrow>
            <div className="flex flex-wrap gap-2">
              {QTYPES.filter((t) => t.key === 'time' || t.key === 'values' || t.key === 'hypo').map((t) => (
                <button key={t.key} type="button" disabled={decode.done} className="iv-chip-btn" data-on={decode.type === t.key ? '1' : undefined} data-right={decode.done && t.key === q.type ? '1' : undefined} onClick={() => setDecode((d) => ({ ...d, type: t.key }))}>
                  {t.title}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Eyebrow>Signal areas (pick 1–3)</Eyebrow>
            <div className="flex flex-wrap gap-2">
              {SIGNALS.map((a) => {
                const on = decode.picked.includes(a.key);
                return (
                  <button
                    key={a.key}
                    type="button"
                    disabled={decode.done}
                    className="iv-chip-btn"
                    data-on={on ? '1' : undefined}
                    data-right={decode.done && q.signals.includes(a.key) ? '1' : undefined}
                    data-wrong={decode.done && on && !q.signals.includes(a.key) ? '1' : undefined}
                    onClick={() => setDecode((d) => ({ ...d, picked: on ? d.picked.filter((k) => k !== a.key) : d.picked.length >= 3 ? d.picked : [...d.picked, a.key] }))}
                  >
                    {a.title}
                  </button>
                );
              })}
            </div>
          </div>
          {!decode.done ? (
            <Btn
              disabled={!decode.type || decode.picked.length === 0}
              onClick={() => {
                const hit = decode.picked.filter((k) => q.signals.includes(k)).length;
                const wrong = decode.picked.length - hit;
                setDecode((d) => ({ ...d, done: true, correct: d.type === q.type && hit >= 1 && wrong <= 1 }));
              }}
            >
              Check
            </Btn>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="bh-reveal m-0" data-ok={decode.correct ? '1' : undefined}>
                <b>{decode.correct ? 'Right.' : 'Not quite.'}</b> {qtypeTitle(q.type)}, scoring {q.signals.map((k) => signalByKey(k).title).join(' + ')}. {behind(q)}
              </p>
              <Btn onClick={() => (props.select && isStoryQ && stories.length ? (setPhase('select'), restart()) : toThink())}>
                Continue <Arrow />
              </Btn>
            </div>
          )}
        </section>
      )}

      {phase === 'select' && (
        <section className="panel flex flex-col gap-5 p-5 lg:p-8" aria-label="Select a story">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <Eyebrow>Step 2 · Select</Eyebrow>
              <span className="text-[18px] font-semibold text-text">Which story? Pick fast. Aim for under {SELECT_S}s.</span>
            </div>
            <span className="bh-clock font-display" data-zone={pick ? 'none' : elapsed <= SELECT_S ? 'good' : 'long'}>
              {mmss(pick ? pick.ms / 1000 : elapsed)}
            </span>
          </div>
          {!pick ? (
            <>
              <ul className="bh-pick m-0 list-none p-0">
                {stories.map((s) => (
                  <li key={s.id}>
                    <button type="button" className="bh-pick-btn" onClick={() => setPick({ id: s.id, ms: Date.now() - startedAt, verdict: judgeSelection(s.id, ranked) })}>
                      <span className="text-[15.5px] font-semibold text-text">
                        {s.tier === 'core' && <span className="text-[var(--tier)]">★ </span>}
                        {s.title}
                        {used.get(s.id) ? <span className="font-mono text-[11px] text-dim"> · told</span> : null}
                      </span>
                      <SignalTags keys={s.signals} />
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" className="iv-link w-fit" onClick={() => setPick({ id: null, ms: Date.now() - startedAt, verdict: judgeSelection(null, ranked) })}>
                Nothing fits
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="bh-reveal m-0" data-ok={pick.verdict.grade === 'best' || pick.verdict.grade === 'close' ? '1' : undefined}>
                <b>{{ best: 'Best pick.', close: 'Good pick.', better: 'There was a stronger one.', none: 'Gap in your catalog.' }[pick.verdict.grade]}</b> {pick.verdict.note}
              </p>
              {ranked.length > 0 && ranked[0].relevance > 0 && (
                <ol className="m-0 flex flex-col gap-1.5 pl-5 text-[14px] text-soft">
                  {ranked.slice(0, 3).map((r) => (
                    <li key={r.story.id}>
                      <b className="text-text">{r.story.title}</b>: {r.reasons.join(' · ')}
                    </li>
                  ))}
                </ol>
              )}
              <p className="m-0 text-[13px] text-dim">
                The book&apos;s order: biggest scope first, then the best match for the signal, then a story they have not heard, then the most recent.{' '}
                <ConceptLink concept="selection" go={go}>
                  More →
                </ConceptLink>
              </p>
              <div className="flex flex-wrap gap-3">
                <Btn onClick={toThink}>
                  Tell {story ? `“${story.title}”` : 'it anyway'} <Arrow />
                </Btn>
                {pick.verdict.top && pick.verdict.top.story.id !== pick.id && (
                  <Btn kind="ghost" onClick={() => (setPick({ ...pick, id: pick.verdict.top!.story.id }), toThink())}>
                    Switch to “{pick.verdict.top.story.title}”
                  </Btn>
                )}
                {pick.verdict.grade === 'none' && (
                  <Btn kind="ghost" onClick={() => go({ tab: 'catalog', mode: 'mine', signal: q.signals[0] })}>
                    Mine a story for this
                  </Btn>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {phase === 'think' && (
        <section className="panel flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:gap-10 lg:p-8" aria-label="Think">
          <div className="bh-ring" style={{ ['--p' as string]: Math.min(1, elapsed / THINK_S) }} role="timer" aria-label={`${Math.ceil(THINK_S - elapsed)} seconds to think`}>
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="52" />
              <circle cx="60" cy="60" r="52" className="bh-ring-fill" />
            </svg>
            <span className="font-display">{Math.max(0, Math.ceil(THINK_S - elapsed))}</span>
          </div>
          <div className="flex min-w-0 flex-grow flex-col gap-4">
            <span className="text-[18px] font-semibold text-text">{QTYPES.find((t) => t.key === q.type)?.shape}</span>
            <ThinkCue q={q} story={story} profile={profile} clar={clar} onClarify={(i) => {
              const c = q.clarifiers![i];
              setClar((x) => ({ asked: x.asked.includes(i) ? x.asked : [...x.asked, i], heard: c.a }));
              void say(c.a);
            }} />
            {q.type !== 'ask' && (
              <label className="flex items-center gap-2 text-[13.5px] text-muted">
                <input type="checkbox" checked={record} onChange={() => setRecord(!record)} /> Record audio so I can play it back (stays in this browser)
              </label>
            )}
            <Btn onClick={toAnswer}>
              I&apos;m ready <Arrow />
            </Btn>
          </div>
        </section>
      )}

      {(phase === 'answer' || phase === 'probe') && (
        <section className="panel flex flex-col gap-5 p-5 lg:p-8" aria-label={phase === 'answer' ? 'Answer' : 'Follow-up'}>
          {phase === 'probe' && probes[pi] && (
            <figure className="iv-coach m-0" data-speaking={speech.speaking ? '1' : undefined}>
              <figcaption className="font-mono flex items-center gap-2 text-[11.5px] tracking-[0.14em] text-white/55 uppercase">
                <i className="iv-wave" aria-hidden="true">
                  <b />
                  <b />
                  <b />
                </i>
                {probes[pi].level === 'leaf' ? 'Follow-up · keep it to a sentence or two' : 'Follow-up · answer directly, then a short story if it fits'}
              </figcaption>
              <blockquote className="m-0 text-[18px] leading-[1.5] text-text">{probes[pi].text}</blockquote>
            </figure>
          )}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Eyebrow>{phase === 'answer' ? 'Answer' : `Follow-up ${pi + 1} of ${probes.length}`}</Eyebrow>
              <span className="bh-clock font-display" data-zone={phase === 'probe' && probes[pi]?.level === 'leaf' ? (elapsed <= 20 ? 'good' : elapsed <= 40 ? 'long' : 'over') : zone}>
                {mmss(elapsed)}
              </span>
            </div>
            {phase === 'answer' && q.type !== 'tmay' && q.type !== 'ask' && (
              <div className="bh-beats" role="group" aria-label="Tap the part you are in (keys 1–4)">
                {BEATS.map((b, i) => (
                  <button key={b.key} type="button" aria-pressed={curBeat === b.key} onClick={() => tap(b.key)} title={`${b.hint} (key ${i + 1})`}>
                    <b className="font-display">{b.key.toUpperCase()}</b>
                    <small className="font-mono">{b.title}</small>
                  </button>
                ))}
              </div>
            )}
          </div>
          {phase === 'answer' && (
            <div className="bh-track" aria-hidden="true">
              <span className="bh-band" style={{ left: `${(lo / max) * 100}%`, width: `${((hi - lo) / max) * 100}%` }} />
              <span className="bh-fill" data-zone={zone} style={{ width: `${Math.min(100, (elapsed / max) * 100)}%` }} />
              <span className="bh-tick font-mono" style={{ left: `${(lo / max) * 100}%` }}>
                {mmss(lo)}
              </span>
              <span className="bh-tick font-mono" style={{ left: `${(hi / max) * 100}%` }}>
                {mmss(hi)}
              </span>
            </div>
          )}
          {phase === 'answer' && persona === 'examiner' && q.type === 'time' && (
            <p className="m-0 text-[13px] text-dim">The examiner cuts in around {mmss(EXAMINER_CUT_S)}. Lead with the headline.</p>
          )}
          <div className="bh-live" aria-live="polite">
            {(phase === 'answer' ? segments : probeLines).map((s) => s.text).join(' ')}
            {speech.interim && <span className="text-dim"> {speech.interim}</span>}
            {!speech.stt && <span className="text-muted">Talk out loud anyway; this browser can&apos;t transcribe, so only timing and beats are measured.</span>}
          </div>
          {speech.denied && <p className="notice">The microphone is blocked. Allow it in the address bar to get the full checks.</p>}
          <Btn onClick={() => (phase === 'answer' ? finishAnswer(false) : finishProbe())}>{phase === 'answer' ? 'Done answering' : 'Done'}</Btn>
        </section>
      )}

      {(phase === 'check' || phase === 'saved') && (
        <section className="panel flex flex-col gap-6 p-5 lg:p-8" aria-label="How it went">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display caps m-0 text-[40px] leading-[0.9] font-black">How was it?</h2>
            <span className="bh-score bh-score-lg font-display">{score}</span>
          </div>
          {metrics.split && <SplitBar split={metrics.split} />}
          <ul className="iv-signals m-0 list-none p-0">
            {checks.map((c, i) => (
              <li key={`${c.key}-${i}`} className="iv-signal" data-grade={c.grade} style={{ ['--n' as string]: i }}>
                <span className="iv-signal-label font-mono">{c.label}</span>
                <span className="iv-signal-value font-display">{c.value}</span>
                <span className="iv-signal-target font-mono">
                  target {c.target}
                  {c.grade !== 'good' && (
                    <>
                      {' · '}
                      <ConceptLink concept={c.concept} go={go}>
                        {cardByKey(c.concept).title}
                      </ConceptLink>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {!mic && <p className="m-0 text-[14px] text-muted">Mic was off, so only timing and your beat taps were measured.</p>}
          {probes.length > 0 && (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {probes.map((p, i) => (
                <li key={i} className="text-[14px] text-muted">
                  <b className="text-soft">Why “{p.text}”:</b> {p.why}
                </li>
              ))}
            </ul>
          )}
          {pick && (
            <p className="m-0 text-[14px] text-muted">
              Story pick in {Math.round(pick.ms / 1000)}s: <Grade grade={pick.verdict.grade === 'best' || pick.verdict.grade === 'close' ? 'good' : 'bad'}>{pick.verdict.grade}</Grade>
            </p>
          )}
          {audio && <audio controls src={audio} className="w-full" />}
          {(segments.length > 0 || takes.length > 0) && (
            <details className="bh-details">
              <summary className="font-mono">What you said</summary>
              <p className="m-0 text-[14.5px] leading-[1.6] text-soft">{segments.map((s) => s.text).join(' ')}</p>
              {takes.map((t, i) => (
                <p key={i} className="m-0 mt-3 text-[14.5px] leading-[1.6] text-muted">
                  <b>{t.text}</b> {t.lines.map((s) => s.text).join(' ')}
                </p>
              ))}
            </details>
          )}
          {phase === 'check' ? (
            <div className="flex flex-wrap gap-3">
              <Btn onClick={() => void save()} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Btn>
              <button type="button" className="iv-link" onClick={exit}>
                Discard
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <Btn onClick={props.onNext}>
                {props.nextLabel ?? 'Next'} <Arrow />
              </Btn>
              <button type="button" className="iv-link" onClick={props.onExit}>
                Back
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function SplitBar({ split }: { split: Record<Beat, number> }) {
  return (
    <div className="flex flex-col gap-2">
      <Eyebrow>Your split (target 10 / 60 / 20 / 10)</Eyebrow>
      <div className="bh-split">
        {BEATS.map((b) => (
          <i key={b.key} data-b={b.key} style={{ flexGrow: Math.max(0.02, split[b.key]) }}>
            {b.key.toUpperCase()} {Math.round(split[b.key] * 100)}%
          </i>
        ))}
      </div>
    </div>
  );
}

/** What to look at while thinking, by question type. */
function ThinkCue({
  q,
  story,
  profile,
  clar,
  onClarify,
}: {
  q: BQuestion;
  story?: Story;
  profile: Profile;
  clar: { asked: number[]; heard: string | null };
  onClarify: (i: number) => void;
}) {
  if (q.type === 'hypo' && q.clarifiers)
    return (
      <div className="flex flex-col gap-3">
        <Eyebrow>Ask 1–2 clarifying questions (the interviewer answers)</Eyebrow>
        <div className="flex flex-col gap-2">
          {q.clarifiers.map((c, i) => {
            const done = clar.asked.includes(i);
            return (
              <div key={i} className="flex flex-col gap-1">
                <button type="button" className="bh-prompt" data-asked={done ? '1' : undefined} onClick={() => onClarify(i)}>
                  “{c.q}”
                </button>
                {done && (
                  <span className="pl-3 text-[13.5px] text-muted">
                    <b className="text-soft">“{c.a}”</b> <Grade grade={c.good ? 'good' : 'bad'}>{c.good ? 'useful' : 'weak'}</Grade> {c.why}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <ol className="m-0 flex flex-col gap-1 pl-5 text-[14px] text-soft">
          {HYPO_STEPS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </div>
    );
  if (q.type === 'values')
    return (
      <div className="flex flex-col gap-3">
        <ol className="m-0 flex flex-col gap-1 pl-5 text-[14.5px] text-soft">
          {VALUES_STEPS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <dl className="bh-defs m-0">
          {VALUE_PATTERNS.map((v) => (
            <div key={v.topic}>
              <dt className="font-mono">{v.topic}</dt>
              <dd>{v.axis}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  if (q.type === 'tmay') {
    const t = profile.tmay;
    if (!t.summary && !t.wins.length) return <p className="m-0 text-[14.5px] text-muted">Summary, 2–3 accomplishments with impact, a forward-looking line. (Write it in the Big Three studio for a cue here.)</p>;
    return (
      <ol className="m-0 flex flex-col gap-1.5 pl-5 text-[14.5px] text-soft">
        {t.summary && <li>{t.summary}</li>}
        {t.wins.map((w) => (
          <li key={w}>{w}</li>
        ))}
        {t.halo && <li>{t.halo}</li>}
        {t.gap && <li>{t.gap}</li>}
        {t.forward && <li>{t.forward}</li>}
      </ol>
    );
  }
  if (q.type === 'ask')
    return profile.asks.length ? (
      <ul className="m-0 flex flex-col gap-1.5 pl-5 text-[14.5px] text-soft">
        {profile.asks.map((a) => (
          <li key={a.text}>{a.text}</li>
        ))}
      </ul>
    ) : (
      <p className="m-0 text-[14.5px] text-muted">One or two specific questions for this person. Ask for real examples, not hypotheticals.</p>
    );
  if (!story) return <p className="m-0 text-[14.5px] text-muted">Pick a story you know well. Open with the stakes, spend most of the time on what you did, end on results and a learning.</p>;
  const recut = q.signals.map((k) => story.recuts[k]).find(Boolean);
  return (
    <div className="flex flex-col gap-2">
      <Eyebrow>Your cue: {story.title}</Eyebrow>
      {recut && (
        <p className="m-0 text-[14.5px] text-[var(--tier)]">
          <b>Lead with:</b> {recut}
        </p>
      )}
      {story.context.told && <p className="m-0 text-[14.5px] text-soft">C · {story.context.told}</p>}
      {story.toc.length > 0 ? (
        <ol className="m-0 flex flex-col gap-1 pl-5 text-[14px] text-soft">
          {story.toc.map((t) => (
            <li key={t.theme}>
              {t.theme}
              {t.takeaway && <span className="text-muted"> → {t.takeaway}</span>}
            </li>
          ))}
        </ol>
      ) : (
        <ul className="m-0 flex flex-col gap-1 pl-5 text-[14px] text-soft">
          {story.actions.slice(0, 5).map((a) => (
            <li key={a.text}>{a.text}</li>
          ))}
        </ul>
      )}
      {story.results[0] && <p className="m-0 text-[14px] text-soft">R · {story.results[0].text}</p>}
      {story.learnings[0] && <p className="m-0 text-[14px] text-soft">L · {story.learnings[0].text}</p>}
    </div>
  );
}
