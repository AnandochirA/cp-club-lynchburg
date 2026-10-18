'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import '../../app/dash.css';
import '../../app/interview.css';
import { apiErrors, rankSection } from '@/lib/content';
import { apiPost } from '@/lib/client-api';
import type { Problem } from '@/lib/curriculum';
import type { InterviewRecord, PostMortem } from '@/lib/interview';
import {
  CLOSING,
  NUDGES,
  STAGES,
  STAGE_IDS,
  TOTAL_MINUTES,
  checklistFor,
  followUpsFor,
  interviewCopy as C,
  lastTimeLine,
  stageById,
  type StageId,
} from '@/lib/interview-kit';
import {
  FOLLOW_UP_AT,
  MAX_LINE,
  MAX_NUDGES_PER_STAGE,
  MAX_TRANSCRIPT_CHARS,
  NUDGE_AFTER_MS,
  TALK_GAP_MS,
  clock,
  emptyDraft,
  pick,
  transcriptChars,
  type Draft,
  type Line,
} from '@/lib/interview-logic';
import { Icon } from '../icons';
import { ReviewPanel } from './ReviewPanel';
import { StagePanel } from './StagePanel';
import { StageRail } from './StageRail';
import { Transcript } from './Transcript';
import { useSpeech } from './useSpeech';

const SAVE_EVERY_MS = 15_000;
const diffColor = (d: string) => rankSection.difficulties.find((x) => x.label === d.toLowerCase())?.color ?? '#A7A8AA';

type Phase = 'intro' | 'live' | 'review';

/** Counters for the step you are on, kept out of React state because they tick constantly. */
type Live = { enteredAt: number; talkMs: number; longestSilenceMs: number; nudges: number; lastNudge: number; warnedOver: boolean };

/**
 * One mock interview on one problem. The flow is a little state machine over
 * the seven steps in interview-kit.ts. The draft is the only thing saved; it
 * is folded together with the live counters ("commit") on every step change
 * and autosave, and every change goes through `update` so the ref used by
 * timers and the state used for rendering never drift apart.
 */
export function InterviewRoom({
  problem,
  resume,
  lastNextTime,
}: {
  problem: Problem;
  resume: InterviewRecord | null;
  /** Your own "next time I will…" from the last round, read back at the start of this one. */
  lastNextTime: string | null;
}) {
  const [phase, setPhase] = useState<Phase>(resume?.finishedAt ? 'review' : 'intro');
  const [record, setRecord] = useState<InterviewRecord | null>(resume);
  const [draft, setDraft] = useState<Draft>(resume?.draft ?? emptyDraft());
  const [busy, setBusy] = useState<'start' | 'finish' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [micOn, setMicOn] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const draftRef = useRef(draft);
  const dirty = useRef(false);
  const recordRef = useRef(record);
  recordRef.current = record;
  const live = useRef<Live>({ enteredAt: 0, talkMs: 0, longestSilenceMs: 0, nudges: 0, lastNudge: 0, warnedOver: false });
  const lastHeard = useRef(0);
  const coachUntil = useRef(0);
  const micRef = useRef(false);
  micRef.current = micOn;

  const update = useCallback((fn: (d: Draft) => Draft) => {
    const next = fn(draftRef.current);
    draftRef.current = next;
    dirty.current = true;
    setDraft(next);
  }, []);

  const sinceStart = () => (recordRef.current ? Date.now() - new Date(recordRef.current.startedAt).getTime() : 0);

  const addLine = useCallback(
    (who: Line['who'], text: string) => {
      const d = draftRef.current;
      if (d.stage === 'review') return;
      const t = text.slice(0, MAX_LINE);
      if (transcriptChars(d.transcript) + t.length > MAX_TRANSCRIPT_CHARS) return;
      update((x) => ({ ...x, transcript: [...x.transcript, { stage: d.stage as StageId, who, text: t, at: sinceStart() }] }));
    },
    [update],
  );

  const speech = useSpeech({
    onFinal: (text) => addLine('you', text),
    onHeard: () => {
      const t = Date.now();
      if (micRef.current && t - lastHeard.current < TALK_GAP_MS) live.current.talkMs += t - lastHeard.current;
      lastHeard.current = t;
    },
  });
  const { say, listen } = speech;

  /** The coach speaks (or, with the voice off, just writes) a line. */
  const coach = useCallback(
    (text: string) => {
      addLine('coach', text);
      coachUntil.current = Date.now() + 1000;
      void say(text).then(() => {
        coachUntil.current = Date.now();
        // Silence is measured from the end of the question, not from before it.
        lastHeard.current = Math.max(lastHeard.current, Date.now());
      });
    },
    [addLine, say],
  );

  /** Fold the live counters for the current step into the draft. */
  const commit = useCallback(() => {
    const d = draftRef.current;
    if (d.stage === 'review' || live.current.enteredAt === 0) return;
    const id = d.stage;
    const l = live.current;
    const t = Date.now();
    const s = d.stages[id];
    update((x) => ({
      ...x,
      stages: {
        ...x.stages,
        [id]: {
          ...s,
          ms: s.ms + (t - l.enteredAt),
          talkMs: s.talkMs + l.talkMs,
          longestSilenceMs: Math.max(s.longestSilenceMs, l.longestSilenceMs),
          nudges: s.nudges + l.nudges,
        },
      },
    }));
    live.current = { ...l, enteredAt: t, talkMs: 0, longestSilenceMs: 0, nudges: 0 };
  }, [update]);

  const save = useCallback(
    async (opts: { beacon?: boolean } = {}) => {
      const rec = recordRef.current;
      if (!rec || draftRef.current.stage === 'review') return;
      commit();
      if (!dirty.current) return;
      dirty.current = false;
      const body = { action: 'save', draft: draftRef.current };
      if (opts.beacon) {
        // The tab is closing: keepalive lets the request outlive the page.
        void fetch(`/api/interview/${rec.id}`, {
          method: 'POST',
          keepalive: true,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }).catch(() => {});
        return;
      }
      setSaveState('saving');
      const res = await apiPost(`/api/interview/${rec.id}`, body);
      if (!res.ok) {
        dirty.current = true;
        setSaveState('failed');
        if (res.error === 'too_big') setError(apiErrors.too_big);
        return;
      }
      setSaveState('saved');
    },
    [commit],
  );

  const enter = useCallback(
    (id: StageId, how: 'done' | 'skipped' | 'jump' | 'resume' = 'jump') => {
      commit();
      const from = draftRef.current.stage;
      const t = Date.now();
      live.current = { enteredAt: t, talkMs: 0, longestSilenceMs: 0, nudges: 0, lastNudge: t, warnedOver: false };
      lastHeard.current = t;
      update((x) => {
        const stages = { ...x.stages };
        if (from !== 'review' && from !== id && how !== 'jump' && how !== 'resume') {
          stages[from] = { ...stages[from], done: how === 'done' || stages[from].done, skipped: how === 'skipped' };
        }
        if (!stages[id].followUp) stages[id] = { ...stages[id], followUp: pick(followUpsFor(id, problem.topic)) };
        return { ...x, stage: id, stages };
      });
      // Re-entering a step you already heard does not repeat the whole prompt.
      const st = draftRef.current.stages[id];
      if (how === 'resume') coach(`Welcome back. We were on ${stageById(id).title.toLowerCase()}. ${stageById(id).goal}`);
      else if (st.ms === 0) coach(stageById(id).prompt);
      else coach(`Back to ${stageById(id).title.toLowerCase()}.`);
      void save();
    },
    [commit, update, coach, save, problem.topic],
  );

  function toggleMic(on: boolean) {
    setMicOn(on);
    listen(on);
    if (on && !draftRef.current.mic) update((x) => ({ ...x, mic: true }));
    lastHeard.current = Date.now();
  }

  async function begin(fresh: boolean) {
    setError(null);
    let rec = fresh ? null : resume;
    if (!rec) {
      setBusy('start');
      const res = await apiPost<{ interview: InterviewRecord }>('/api/interview', { slug: problem.slug });
      setBusy(null);
      if (!res.ok) return setError(apiErrors[res.error] ?? apiErrors.server);
      rec = res.data.interview;
    }
    recordRef.current = rec;
    setRecord(rec);
    draftRef.current = rec.draft;
    setDraft(rec.draft);
    setPhase('live');
    if (speech.stt) toggleMic(true);
    const at = rec.draft.stage === 'review' ? 'read' : rec.draft.stage;
    if (rec !== resume && lastNextTime) coach(lastTimeLine(lastNextTime));
    enter(at, rec === resume ? 'resume' : 'jump');
  }

  async function finish() {
    const rec = recordRef.current;
    if (!rec || busy) return;
    setBusy('finish');
    commit();
    toggleMic(false);
    coach(CLOSING);
    // Pull the latest solves first so the AC check can see a submission made a minute ago.
    // 'too_soon' just means a sync ran recently, which is fine.
    await apiPost('/api/me/sync');
    const d = draftRef.current;
    const done = { ...d, stages: { ...d.stages, [d.stage as StageId]: { ...d.stages[d.stage as StageId], done: true } } };
    const res = await apiPost<{ interview: InterviewRecord }>(`/api/interview/${rec.id}`, { action: 'finish', draft: done });
    setBusy(null);
    if (!res.ok) return setError(apiErrors[res.error] ?? apiErrors.server);
    dirty.current = false;
    setRecord(res.data.interview);
    draftRef.current = res.data.interview.draft;
    setDraft(res.data.interview.draft);
    setPhase('review');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function lockIn(pm: PostMortem) {
    if (!record) return false;
    const res = await apiPost<{ interview: InterviewRecord }>(`/api/interview/${record.id}`, { action: 'finish', ...pm });
    if (!res.ok) {
      setError(apiErrors[res.error] ?? apiErrors.server);
      return false;
    }
    setRecord(res.data.interview);
    return true;
  }

  async function recheck() {
    if (!record) return;
    const sync = await apiPost('/api/me/sync');
    if (!sync.ok && sync.error !== 'too_soon') setError(apiErrors[sync.error] ?? apiErrors.server);
    const res = await apiPost<{ interview: InterviewRecord }>(`/api/interview/${record.id}`, { action: 'finish' });
    if (res.ok) setRecord(res.data.interview);
  }

  // The 1-second heartbeat: clocks, silence, follow-ups, nudges, overrun warnings.
  const tick = useRef(() => {});
  tick.current = () => {
    const t = Date.now();
    setNow(t);
    const d = draftRef.current;
    if (phase !== 'live' || d.stage === 'review' || live.current.enteredAt === 0) return;
    const id = d.stage;
    const s = d.stages[id];
    const stage = stageById(id);
    const budget = stage.minutes * 60_000;
    const elapsed = s.ms + (t - live.current.enteredAt);
    const coachBusy = speech.speaking || t < coachUntil.current;
    if (coachBusy) return;

    if (micRef.current) {
      const quiet = t - Math.max(lastHeard.current, live.current.enteredAt, coachUntil.current);
      live.current.longestSilenceMs = Math.max(live.current.longestSilenceMs, quiet);
      const sinceNudge = t - live.current.lastNudge;
      if (quiet >= NUDGE_AFTER_MS && sinceNudge >= NUDGE_AFTER_MS && s.nudges + live.current.nudges < MAX_NUDGES_PER_STAGE) {
        live.current.nudges += 1;
        live.current.lastNudge = t;
        coach(pick(id === 'code' ? NUDGES.code : NUDGES.default));
        return;
      }
    }
    if (!s.asked && s.followUp && elapsed >= budget * FOLLOW_UP_AT) {
      update((x) => ({ ...x, stages: { ...x.stages, [id]: { ...x.stages[id], asked: true } } }));
      coach(s.followUp);
      return;
    }
    if (!live.current.warnedOver && elapsed >= budget) {
      live.current.warnedOver = true;
      coach("That's the time for this step. Wrap up and move on when you're ready.");
    }
  };
  useEffect(() => {
    const id = setInterval(() => tick.current(), 1000);
    return () => clearInterval(id);
  }, []);

  // Autosave while live, and a last save if the tab is hidden or closed.
  useEffect(() => {
    if (phase !== 'live') return;
    const id = setInterval(() => void save(), SAVE_EVERY_MS);
    const onHide = () => {
      if (document.visibilityState === 'hidden') void save({ beacon: true });
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
    };
  }, [phase, save]);

  const stageId = draft.stage === 'review' ? null : draft.stage;
  const idx = stageId ? STAGE_IDS.indexOf(stageId) : -1;
  const liveMs = phase === 'live' && live.current.enteredAt ? Math.max(0, now - live.current.enteredAt) : 0;
  const totalMs = STAGE_IDS.reduce((n, id) => n + draft.stages[id].ms, 0) + liveMs;
  const quietS = micOn && phase === 'live' && !speech.speaking ? Math.floor((now - Math.max(lastHeard.current, coachUntil.current)) / 1000) : 0;
  const lastCoach = [...draft.transcript].reverse().find((l) => l.who === 'coach' && l.stage === stageId);
  const full = transcriptChars(draft.transcript) >= MAX_TRANSCRIPT_CHARS - MAX_LINE;

  return (
    <div className="dash" style={{ ['--tier' as string]: diffColor(problem.difficulty) }}>
      <div className="dash-aurora" aria-hidden="true">
        <i />
        <i />
      </div>

      <header className="dash-bar">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/me" className="font-mono shrink-0 text-sm text-muted no-underline hover:text-text">
            ← {C.back}
          </Link>
          <span className="hidden min-w-0 flex-col sm:flex">
            <span className="truncate text-[15px] font-semibold">{problem.title}</span>
            <span className="font-mono text-[11.5px]" style={{ color: diffColor(problem.difficulty) }}>
              {problem.difficulty.toLowerCase()} · {problem.topic}
            </span>
          </span>
        </div>
        {phase === 'live' && (
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="font-mono hidden text-[12px] text-white/55 md:inline" role="status">
              {saveState === 'saving' ? C.saving : saveState === 'saved' ? C.saved : saveState === 'failed' ? C.saveFailed : ''}
            </span>
            <span className="font-mono text-[14px] tabular-nums" aria-label="Total time">
              <span className={totalMs > TOTAL_MINUTES * 60_000 ? 'text-gold' : 'text-text'}>{clock(totalMs)}</span>
              <span className="text-dim"> / {TOTAL_MINUTES}:00</span>
            </span>
            <button
              type="button"
              className="bar-btn"
              aria-pressed={speech.voiceOn}
              onClick={() => {
                if (speech.voiceOn) speech.hush();
                speech.setVoiceOn(!speech.voiceOn);
              }}
              disabled={!speech.tts}
              title={speech.voiceOn ? C.voiceOn : C.voiceOff}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 5 6 9H2v6h4l5 4z" />
                {speech.voiceOn ? <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" /> : <path d="m22 9-6 6M16 9l6 6" />}
              </svg>
              <span className="hidden lg:inline">{speech.voiceOn ? C.voiceOn : C.voiceOff}</span>
            </button>
            {speech.stt && (
              <button
                type="button"
                className={`bar-btn ${micOn ? 'primary' : ''}`}
                aria-pressed={micOn}
                onClick={() => toggleMic(!micOn)}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                  {!micOn && <path d="m4 4 16 16" />}
                </svg>
                {micOn ? C.micOn : C.micOff}
              </button>
            )}
          </div>
        )}
      </header>

      <div className="dash-wrap">
        {error && (
          <p role="alert" className="notice">
            {error}
          </p>
        )}

        {phase === 'intro' && (
          <section className="panel flex flex-col gap-6 p-5 lg:p-8" aria-labelledby="intro-title">
            <div className="flex flex-col gap-2">
              <span className="eyebrow-m">{C.eyebrow}</span>
              <h1 id="intro-title" className="font-display caps m-0 text-[48px] leading-[0.86] font-black lg:text-[72px]">
                {problem.title}
              </h1>
              <span className="font-mono text-[13px]" style={{ color: diffColor(problem.difficulty) }}>
                #{problem.id} · {problem.difficulty.toLowerCase()} · {problem.topic}
              </span>
            </div>
            <p className="m-0 max-w-[64ch] text-[16.5px] leading-[1.55] text-soft">{C.introLead}</p>
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[12px] tracking-[0.1em] text-dim uppercase">{C.introSteps}</span>
              <ol className="iv-intro-steps m-0 list-none p-0">
                {STAGES.map((s, i) => (
                  <li key={s.id}>
                    <span className="font-mono text-dim">{i + 1}</span>
                    <span className="font-semibold text-text">{s.title}</span>
                    <span className="text-muted">{s.goal}</span>
                    <span className="font-mono text-dim">{s.minutes}m</span>
                  </li>
                ))}
              </ol>
            </div>
            <p className="m-0 max-w-[64ch] text-[14px] leading-[1.5] text-muted">{C.micNote}</p>
            {!speech.stt && <p className="notice">{C.noStt}</p>}
            {!speech.tts && <p className="notice">{C.noTts}</p>}
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => void begin(false)}
                disabled={busy !== null}
                className="btn btn-primary [clip-path:polygon(0_0,calc(100%-10px)_0,100%_10px,100%_100%,0_100%)] flex h-13 cursor-pointer items-center justify-center gap-2.5 rounded-none border-0 px-7 font-sans text-base font-semibold text-white"
              >
                <span className="sheen" aria-hidden="true" />
                {busy === 'start' ? C.starting : resume ? C.resume : C.start}
                <Icon name="arrow" size={18} stroke={2.2} className="arrow" />
              </button>
              {resume && (
                <button type="button" onClick={() => void begin(true)} disabled={busy !== null} className="iv-link">
                  {C.restart}
                </button>
              )}
            </div>
          </section>
        )}

        {phase === 'live' && stageId && (
          <>
            <h1 className="sr-only">
              {C.title}: {problem.title}
            </h1>
            <StageRail draft={draft} liveMs={liveMs} onPick={(id) => id !== stageId && enter(id)} />
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-12 xl:gap-5">
              <div className="xl:col-span-8">
                <StagePanel
                  key={stageId}
                  stage={stageById(stageId)}
                  index={idx}
                  state={draft.stages[stageId]}
                  checklist={checklistFor(stageId, problem.topic)}
                  coachLine={lastCoach?.text ?? stageById(stageId).prompt}
                  speaking={speech.speaking}
                  elapsedMs={draft.stages[stageId].ms + liveMs}
                  problem={problem}
                  isLast={idx === STAGE_IDS.length - 1}
                  busy={busy !== null}
                  onRepeat={() => void say(lastCoach?.text ?? stageById(stageId).prompt)}
                  onNotes={(notes) => update((x) => ({ ...x, stages: { ...x.stages, [stageId]: { ...x.stages[stageId], notes } } }))}
                  onToggle={(i) =>
                    update((x) => {
                      const c = x.stages[stageId].checked;
                      const checked = c.includes(i) ? c.filter((n) => n !== i) : [...c, i];
                      return { ...x, stages: { ...x.stages, [stageId]: { ...x.stages[stageId], checked } } };
                    })
                  }
                  onNext={() => (idx === STAGE_IDS.length - 1 ? void finish() : enter(STAGE_IDS[idx + 1], 'done'))}
                  onSkip={() => enter(STAGE_IDS[idx + 1], 'skipped')}
                />
              </div>
              <aside className="panel flex flex-col gap-3 p-5 xl:col-span-4" aria-label={C.transcript}>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display caps m-0 text-[26px] leading-[0.95] font-black">{C.transcript}</h2>
                  {micOn && (
                    <span className="iv-meter font-mono" data-quiet={quietS >= 15 ? '1' : undefined} role="status">
                      <i aria-hidden="true" />
                      {speech.speaking ? C.interviewer : quietS >= 3 ? C.quietFor(quietS) : C.talking}
                    </span>
                  )}
                </div>
                {speech.denied && <p className="notice">{C.micDenied}</p>}
                {!speech.stt && <p className="m-0 text-[13.5px] leading-[1.5] text-muted">{C.noStt}</p>}
                <Transcript lines={draft.transcript} interim={speech.interim} full={full} live />
              </aside>
            </div>
          </>
        )}

        {phase === 'review' && record && (
          <>
            <h1 className="sr-only">
              {C.review.title} {problem.title}
            </h1>
            <ReviewPanel record={record} problem={problem} onLockIn={lockIn} onRecheck={recheck} />
          </>
        )}
      </div>
    </div>
  );
}
