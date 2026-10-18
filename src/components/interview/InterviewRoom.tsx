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
  CURVEBALL_AT,
  INTERRUPTS,
  MISLEADER_ACK,
  NUDGES,
  PATTERN_SUGGESTIONS,
  PERSONAS,
  PERSONA_KEYS,
  PERSONA_TIMING,
  REPEAT_LINE,
  RUSHES,
  TERSE_PROMPTS,
  STAGES,
  STAGE_IDS,
  TOTAL_MINUTES,
  checklistFor,
  followUpsFor,
  interviewCopy as C,
  lastTimeLine,
  stageById,
  steerFor,
  type PersonaKey,
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
  type LineTag,
} from '@/lib/interview-logic';
import { AI_LIMITS, CHECK_STAGES, isQuestion, type TurnReply, type TurnTrigger } from '@/lib/interviewer-logic';
import { Icon } from '../icons';
import { ProblemStatement } from './ProblemStatement';
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
  autostart = false,
  startMode = 'practice',
  aiAvailable = false,
}: {
  problem: Problem;
  resume: InterviewRecord | null;
  /** Your own "next time I will…" from the last round, read back at the start of this one. */
  lastNextTime: string | null;
  /** Begin at once (the blind draw already showed the problem). */
  autostart?: boolean;
  /** The mode a fresh start asks for. Blind rounds are started by the draw, never here. */
  startMode?: 'practice' | 'redo';
  /** An OpenAI key is configured and you have AI rounds left today. */
  aiAvailable?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>(resume?.finishedAt ? 'review' : 'intro');
  const [record, setRecord] = useState<InterviewRecord | null>(resume);
  const [draft, setDraft] = useState<Draft>(resume?.draft ?? emptyDraft());
  const [busy, setBusy] = useState<'start' | 'finish' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [micOn, setMicOn] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [choice, setChoice] = useState<PersonaKey | 'mystery'>('coach');
  const [wantAi, setWantAi] = useState(aiAvailable);
  const [naturalVoice, setNaturalVoice] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [ask, setAsk] = useState('');
  // The side column: the statement while you work through the steps, or the transcript.
  const [side, setSide] = useState<'problem' | 'transcript'>('problem');

  const draftRef = useRef(draft);
  const dirty = useRef(false);
  const recordRef = useRef(record);
  recordRef.current = record;
  const live = useRef<Live>({ enteredAt: 0, talkMs: 0, longestSilenceMs: 0, nudges: 0, lastNudge: 0, warnedOver: false });
  const lastHeard = useRef(0);
  const coachUntil = useRef(0);
  const micRef = useRef(false);
  micRef.current = micOn;
  const mode = record?.mode ?? startMode;
  const blind = mode === 'blind';
  // A blind round's coach must not leak the pattern through topic-specific follow-ups.
  const coachTopic = blind ? '' : problem.topic;
  const persona: PersonaKey = record?.persona ?? (choice === 'mystery' ? 'coach' : choice);
  const P = PERSONAS[persona];
  const stone = persona === 'stone';
  const isAi = !!record?.ai;
  // A mystery interviewer stays unnamed until the review.
  const hidePersona = draft.extras.mystery && phase !== 'review';
  // AI turn bookkeeping: one request at a time, and the AI goes quiet for the round if it is switched off or out of budget.
  const aiBusy = useRef(false);
  const aiDead = useRef(false);
  const lastAiAt = useRef(0);
  const youAtLastAi = useRef(0);
  const askTimer = useRef(0);
  const speechStart = useRef(0);
  const lastInterrupt = useRef(0);
  const interrupts = useRef(0);

  const update = useCallback((fn: (d: Draft) => Draft) => {
    const next = fn(draftRef.current);
    draftRef.current = next;
    dirty.current = true;
    setDraft(next);
  }, []);

  const sinceStart = () => (recordRef.current ? Date.now() - new Date(recordRef.current.startedAt).getTime() : 0);

  const addLine = useCallback(
    (who: Line['who'], text: string, tag?: LineTag) => {
      const d = draftRef.current;
      if (d.stage === 'review') return;
      const t = text.slice(0, MAX_LINE);
      if (transcriptChars(d.transcript) + t.length > MAX_TRANSCRIPT_CHARS) return;
      const line: Line = { stage: d.stage as StageId, who, text: t, at: sinceStart(), ...(tag ? { tag } : {}) };
      update((x) => ({ ...x, transcript: [...x.transcript, line] }));
    },
    [update],
  );

  // The natural voice: each coach line is spoken by OpenAI in the persona's voice; null falls back to the browser.
  const cloud = useCallback(async (text: string) => {
    const rec = recordRef.current;
    if (!rec) return null;
    const res = await fetch(`/api/interview/${rec.id}/voice`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
    }).catch(() => null);
    return res?.ok ? res.blob() : null;
  }, []);

  const onFinalRef = useRef<(text: string) => void>(() => {});
  const speech = useSpeech({
    onFinal: (text) => onFinalRef.current(text),
    onHeard: () => {
      const t = Date.now();
      if (t - lastHeard.current >= TALK_GAP_MS) speechStart.current = t;
      if (micRef.current && t - lastHeard.current < TALK_GAP_MS) live.current.talkMs += t - lastHeard.current;
      lastHeard.current = t;
    },
    cloud: isAi && naturalVoice ? cloud : undefined,
    rate: P.rate,
  });
  const { say, listen } = speech;

  /** The coach speaks (or, with the voice off, just writes) a line. */
  const coach = useCallback(
    (text: string, tag?: LineTag) => {
      addLine('coach', text, tag);
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

  /**
   * Ask the AI interviewer to react. Resolves true if it said something.
   * Failures are quiet: the scripted coach keeps the round going.
   */
  const aiTurn = useCallback(
    async (trigger: TurnTrigger, ctx: { finished?: StageId; next?: StageId } = {}) => {
      const rec = recordRef.current;
      if (!rec?.ai || aiDead.current || aiBusy.current) return false;
      aiBusy.current = true;
      setThinking(true);
      lastAiAt.current = Date.now();
      youAtLastAi.current = draftRef.current.transcript.filter((l) => l.who === 'you').length;
      const ctl = new AbortController();
      const timer = window.setTimeout(() => ctl.abort(), AI_LIMITS.replyTimeoutMs + 1500);
      let said = false;
      try {
        const res = await fetch(`/api/interview/${rec.id}/turn`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ trigger, draft: draftRef.current, ...ctx }),
          signal: ctl.signal,
        });
        const json = (await res.json().catch(() => ({}))) as { reply?: TurnReply; error?: string };
        if (res.ok) setAiNote((n) => (n === C.ai.down ? null : n));
        if (res.ok && json.reply?.say) {
          coach(json.reply.say, 'ai');
          said = true;
          setAiNote(null);
        } else if (json.error === 'ai_limit' || json.error === 'ai_off') {
          aiDead.current = true;
          setAiNote(C.ai.offNow);
        } else if (!res.ok) {
          setAiNote(C.ai.down);
        }
      } catch {
        /* timed out or offline: the scripted line covers it */
      } finally {
        window.clearTimeout(timer);
        aiBusy.current = false;
        setThinking(false);
      }
      return said;
    },
    [coach],
  );

  const promptFor = useCallback(
    (id: StageId) => (stone ? TERSE_PROMPTS[id] : stageById(id).prompt),
    [stone],
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
        if (!stages[id].followUp) stages[id] = { ...stages[id], followUp: pick(followUpsFor(id, coachTopic)) };
        return { ...x, stage: id, stages };
      });
      // Re-entering a step you already heard does not repeat the whole prompt.
      const st = draftRef.current.stages[id];
      interrupts.current = 0;
      if (how === 'resume') coach(`Welcome back. We were on ${stageById(id).title.toLowerCase()}. ${stageById(id).goal}`, 'prompt');
      else if (st.ms === 0) {
        // The Misleader agrees with whatever you just did; the AI reacts to it; everyone else just moves on.
        const prompt = persona === 'misleader' && how === 'done' ? `${MISLEADER_ACK} ${promptFor(id)}` : promptFor(id);
        if (recordRef.current?.ai && how === 'done' && from !== 'review') {
          void aiTurn('stage_end', { finished: from, next: id }).then((said) => !said && coach(prompt, 'prompt'));
        } else coach(prompt, 'prompt');
      } else coach(`Back to ${stageById(id).title.toLowerCase()}.`, 'prompt');
      void save();
    },
    [commit, update, coach, save, coachTopic, persona, promptFor, aiTurn],
  );

  // What happens when you finish a sentence: it joins the transcript, a question goes to the AI, and
  // anyone but the Coach may pretend they didn't catch a long one.
  onFinalRef.current = (text: string) => {
    addLine('you', text);
    const d = draftRef.current;
    if (d.stage === 'review') return;
    if (recordRef.current?.ai && isQuestion(text)) {
      window.clearTimeout(askTimer.current);
      askTimer.current = window.setTimeout(() => void aiTurn('question'), AI_LIMITS.questionDebounceMs);
      return;
    }
    const long = text.split(/\s+/).length >= 12;
    const repeated = d.transcript.some((l) => l.tag === 'repeat');
    if (persona !== 'coach' && long && !repeated && (d.stage === 'approach' || d.stage === 'test') && Math.random() < PERSONA_TIMING.repeatChance) {
      coach(REPEAT_LINE, 'repeat');
    }
  };

  function askTyped() {
    const q = ask.trim();
    if (!q) return;
    setAsk('');
    addLine('you', q);
    void aiTurn('question');
  }

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
      const res = await apiPost<{ interview: InterviewRecord }>('/api/interview', {
        slug: problem.slug,
        mode: startMode,
        persona: choice,
        ai: wantAi && aiAvailable,
      });
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
    // A session nobody has spent time in yet (a blind draw lands here) is a fresh start, not a resume.
    const untouched = STAGE_IDS.every((id) => rec.draft.stages[id].ms === 0);
    if ((rec !== resume || untouched) && lastNextTime && rec.persona !== 'stone') coach(lastTimeLine(lastNextTime), 'prompt');
    enter(at, rec === resume && !untouched ? 'resume' : 'jump');
  }

  async function finish() {
    const rec = recordRef.current;
    if (!rec || busy) return;
    setBusy('finish');
    commit();
    toggleMic(false);
    coach(stone ? "That's time." : CLOSING, 'prompt');
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
      // The Stone Face never nudges: keeping yourself going is the drill.
      if (!stone && quiet >= NUDGE_AFTER_MS && sinceNudge >= NUDGE_AFTER_MS && s.nudges + live.current.nudges < MAX_NUDGES_PER_STAGE) {
        live.current.nudges += 1;
        live.current.lastNudge = t;
        coach(pick(id === 'code' ? NUDGES.code : NUDGES.default), 'nudge');
        return;
      }
      // The Interrupter cuts in once you have been talking for a while without a break.
      const talkingNow = t - lastHeard.current < 1500 && t - speechStart.current >= PERSONA_TIMING.interruptAfterTalkMs;
      if (
        persona === 'interrupter' &&
        talkingNow &&
        CHECK_STAGES.includes(id) &&
        interrupts.current < PERSONA_TIMING.interruptsPerStage &&
        t - lastInterrupt.current >= PERSONA_TIMING.interruptGapMs
      ) {
        interrupts.current += 1;
        lastInterrupt.current = t;
        speechStart.current = t;
        coach(pick(INTERRUPTS), 'interrupt');
        return;
      }
    }
    // The Misleader's wrong turn, once, partway into Approach.
    if (persona === 'misleader' && id === 'approach' && elapsed >= budget * PERSONA_TIMING.steerAt && !d.transcript.some((l) => l.tag === 'steer')) {
      coach(steerFor(problem.topic), 'steer');
      return;
    }
    // The Rusher's fake time warnings.
    const total = STAGE_IDS.reduce((n, sid) => n + d.stages[sid].ms, 0) + (t - live.current.enteredAt);
    const rushed = d.transcript.filter((l) => l.tag === 'rush').length;
    if (persona === 'rusher' && rushed < RUSHES.length && total >= TOTAL_MINUTES * 60_000 * PERSONA_TIMING.rushAt[rushed]) {
      coach(RUSHES[rushed], 'rush');
      return;
    }
    // The AI listens in now and then, once you have said something new.
    const youNow = d.transcript.filter((l) => l.who === 'you').length;
    const every = persona === 'interrupter' ? AI_LIMITS.checkEveryMsInterrupter : AI_LIMITS.checkEveryMs;
    if (isAi && CHECK_STAGES.includes(id) && t - lastAiAt.current >= every && youNow - youAtLastAi.current >= 2 && !aiBusy.current) {
      void aiTurn('check');
    }
    const x = d.extras;
    if (id === 'test' && x.curveball && !x.curveAsked && elapsed >= budget * CURVEBALL_AT) {
      update((v) => ({ ...v, extras: { ...v.extras, curveAsked: true } }));
      coach(x.curveball, 'curveball');
      return;
    }
    // With the AI on, it asks its own follow-ups; the scripted ones are for the scripted coach.
    if (!isAi && !s.asked && s.followUp && elapsed >= budget * FOLLOW_UP_AT) {
      update((x) => ({ ...x, stages: { ...x.stages, [id]: { ...x.stages[id], asked: true } } }));
      coach(s.followUp, 'followup');
      return;
    }
    if (!live.current.warnedOver && elapsed >= budget) {
      live.current.warnedOver = true;
      coach(stone ? 'Time.' : "That's the time for this step. Wrap up and move on when you're ready.", 'warn');
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

  // Straight in from the blind draw: start as soon as the browser's speech support is known.
  const started = useRef(false);
  useEffect(() => {
    if (!autostart || !speech.ready || started.current || phase !== 'intro') return;
    started.current = true;
    window.history.replaceState(null, '', window.location.pathname);
    void begin(false);
    // begin is recreated every render; this must run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autostart, speech.ready, phase]);

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
              {problem.difficulty.toLowerCase()} ·{' '}
              {blind && phase !== 'review' ? (
                <span className="iv-hidden">
                  {C.blind.hidden} <b aria-hidden="true" />
                </span>
              ) : (
                problem.topic
              )}
            </span>
          </span>
        </div>
        {phase === 'live' && (
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="iv-persona-badge font-mono" data-persona={hidePersona ? 'mystery' : persona}>
              {hidePersona ? C.persona.unknown : P.name}
              {isAi && <b>AI</b>}
            </span>
            {isAi && (
              <button
                type="button"
                className="bar-btn hidden xl:inline-flex"
                aria-pressed={naturalVoice}
                onClick={() => {
                  speech.hush();
                  setNaturalVoice((v) => !v);
                }}
              >
                {naturalVoice ? C.ai.natural : C.ai.browser}
              </button>
            )}
            <span className="font-mono hidden text-[12px] text-white/55 2xl:inline" role="status">
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
                #{problem.id} · {problem.difficulty.toLowerCase()} · {blind ? C.blind.hidden : problem.topic}
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
            {!resume && (
              <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
                <legend className="mb-3 p-0 font-mono text-[12px] tracking-[0.1em] text-dim uppercase">{C.persona.choose}</legend>
                <div className="iv-personas">
                  {[...PERSONA_KEYS, 'mystery' as const].map((k) => {
                    const info = k === 'mystery' ? { name: C.persona.mystery, how: C.persona.mysteryHow } : PERSONAS[k];
                    return (
                      <label key={k} className="iv-persona" data-persona={k}>
                        <input type="radio" name="persona" checked={choice === k} onChange={() => setChoice(k)} />
                        <span>
                          <span className="iv-persona-mark" aria-hidden="true">
                            {k === 'mystery' ? '?' : info.name.replace('The ', '').charAt(0)}
                          </span>
                          <b className="font-display caps">{info.name}</b>
                          <small>{info.how}</small>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}
            {!resume && aiAvailable && (
              <label className="iv-ai-toggle">
                <input type="checkbox" checked={wantAi} onChange={(e) => setWantAi(e.target.checked)} />
                <span>
                  <b>{C.ai.toggle}</b>
                  <small>{C.ai.toggleNote}</small>
                </span>
              </label>
            )}
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
            <StageRail draft={draft} liveMs={liveMs} locked={blind} onPick={(id) => id !== stageId && enter(id)} />
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-12 xl:gap-5">
              <div className="xl:col-span-8">
                <StagePanel
                  key={stageId}
                  stage={stageById(stageId)}
                  index={idx}
                  state={draft.stages[stageId]}
                  checklist={checklistFor(stageId, problem.topic, blind)}
                  canSkip={!blind}
                  coachLine={lastCoach?.text ?? promptFor(stageId)}
                  speaking={speech.speaking}
                  thinking={thinking}
                  who={hidePersona ? C.interviewer : `${C.interviewer} · ${P.name}`}
                  elapsedMs={draft.stages[stageId].ms + liveMs}
                  problem={problem}
                  isLast={idx === STAGE_IDS.length - 1}
                  busy={busy !== null}
                  onRepeat={() => void say(lastCoach?.text ?? promptFor(stageId))}
                  finishLabel={isAi ? C.ai.writing : undefined}
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
                >
                  {isAi && (
                    <form
                      className="iv-ask"
                      onSubmit={(e) => {
                        e.preventDefault();
                        askTyped();
                      }}
                    >
                      <input
                        className="iv-input"
                        value={ask}
                        maxLength={300}
                        onChange={(e) => setAsk(e.target.value)}
                        placeholder={C.ai.askPlaceholder}
                        aria-label={C.ai.ask}
                      />
                      <button type="submit" className="bar-btn" disabled={!ask.trim() || thinking}>
                        {C.ai.ask}
                      </button>
                    </form>
                  )}
                  {aiNote && <p className="notice">{aiNote}</p>}
                  {blind && stageId === 'approach' && (
                    <label className="flex flex-col gap-2">
                      <span className="font-mono text-[12px] tracking-[0.1em] text-dim uppercase">{C.blind.pattern}</span>
                      <input
                        type="text"
                        list="iv-patterns"
                        className="iv-input"
                        maxLength={80}
                        value={draft.extras.pattern}
                        placeholder={C.blind.patternPlaceholder}
                        onChange={(e) => update((v) => ({ ...v, extras: { ...v.extras, pattern: e.target.value } }))}
                      />
                      <datalist id="iv-patterns">
                        {PATTERN_SUGGESTIONS.map((p) => (
                          <option key={p} value={p} />
                        ))}
                      </datalist>
                      <span className="text-[13px] text-dim">{C.blind.patternNote}</span>
                    </label>
                  )}
                  {stageId === 'test' && draft.extras.curveAsked && (
                    <div className="iv-curve">
                      <span className="font-mono text-[12px] tracking-[0.14em] text-gold uppercase">{C.curveball}</span>
                      <p className="m-0 text-[16.5px] leading-[1.5] text-text">{draft.extras.curveball}</p>
                      <textarea
                        className="iv-notes"
                        rows={4}
                        maxLength={2000}
                        value={draft.extras.curveAnswer}
                        placeholder={C.curveballPlaceholder}
                        onChange={(e) => update((v) => ({ ...v, extras: { ...v.extras, curveAnswer: e.target.value } }))}
                        aria-label={C.yourAnswer}
                      />
                      <span className="text-[13px] text-dim">{C.curveballNote}</span>
                    </div>
                  )}
                </StagePanel>
              </div>
              <aside className="panel iv-side flex flex-col gap-3 p-5 xl:col-span-4" aria-label={side === 'problem' ? C.statement.tab : C.transcript}>
                <div className="flex items-center justify-between gap-3">
                  <div role="tablist" aria-label="Side panel" className="iv-tabs">
                    {(['problem', 'transcript'] as const).map((t) => (
                      <button key={t} type="button" role="tab" aria-selected={side === t} onClick={() => setSide(t)} className="font-display caps">
                        {t === 'problem' ? C.statement.tab : C.transcript}
                      </button>
                    ))}
                  </div>
                  {micOn && (
                    <span className="iv-meter font-mono" data-quiet={quietS >= 15 ? '1' : undefined} role="status">
                      <i aria-hidden="true" />
                      {speech.speaking ? C.interviewer : quietS >= 3 ? C.quietFor(quietS) : C.talking}
                    </span>
                  )}
                </div>
                {speech.denied && <p className="notice">{C.micDenied}</p>}
                {/* Both stay mounted so switching tabs never refetches the statement or loses the transcript's scroll. */}
                <div className="iv-side-body" hidden={side !== 'problem'}>
                  <ProblemStatement slug={problem.slug} />
                </div>
                <div className="iv-side-body" hidden={side !== 'transcript'}>
                  {!speech.stt && <p className="m-0 mb-3 text-[13.5px] leading-[1.5] text-muted">{C.noStt}</p>}
                  <Transcript lines={draft.transcript} interim={speech.interim} full={full} live />
                </div>
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
