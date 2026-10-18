/**
 * Game film: a round turned into a timeline you can scrub, like a coach
 * reviewing tape. Everything is rebuilt from the saved transcript (each line
 * has its step and its time), so old rounds get film too. Also here: the
 * calibration between your self-scores and what the evidence says.
 */
import { SCORE_KEYS, clock, findProblem, mentionsComplexity, scored, wordCount, type Draft, type LineTag, type Metrics, type MistakeKey, type RoundFacts, type Scores, type TalkStats } from './interview-logic';
import { patternMatches, stageById, type ScoreKey, type StageId } from './interview-kit';

export type Segment = { stage: StageId; from: number; to: number };
export type Span = { from: number; to: number; line: number };
export type MomentKind = 'idea' | 'complexity' | 'silence' | 'markedDown' | Exclude<LineTag, 'prompt' | 'warn'>;
export type Moment = { at: number; kind: MomentKind; label: string; line: number | null };
export type Film = { total: number; segments: Segment[]; speech: Span[]; coach: Span[]; gaps: { from: number; to: number }[]; moments: Moment[] };

/** Silences shorter than this are just thinking; longer ones are marked. */
export const FILM_GAP_MS = 20_000;
/** Rough speaking speed, to turn a recognised phrase back into a span of time. */
const WORDS_PER_SEC = 2.5;

const MOMENT_LABEL: Partial<Record<MomentKind, string>> = {
  nudge: 'Coach nudged you',
  followup: 'Follow-up question',
  curveball: 'Curveball',
  interrupt: 'Interrupted',
  steer: 'Steered toward the wrong idea',
  rush: 'Fake time warning',
  repeat: '“Say that again?”',
  ai: 'Interviewer spoke',
};

/** "12:40" or "1:02:05" back to ms; null if it isn't a time. */
export function parseClock(s: string): number | null {
  const m = s.trim().replace(/^\[|\]$/g, '').match(/^(?:(\d+):)?(\d{1,3}):(\d{2})$/);
  if (!m) return null;
  return ((Number(m[1] ?? 0) * 60 + Number(m[2])) * 60 + Number(m[3])) * 1000;
}

export function film(d: Draft, metrics: Metrics | null, markedDown?: { at: string; why: string } | null): Film {
  const lines = d.transcript;
  const stageTotal = Object.values(d.stages).reduce((n, s) => n + s.ms, 0);
  const total = Math.max(stageTotal, lines.length ? lines[lines.length - 1].at + 1000 : 0, 1000);

  // Steps: a new segment starts whenever the transcript moves to another step.
  const segments: Segment[] = [];
  for (const l of lines) {
    const last = segments[segments.length - 1];
    if (!last) segments.push({ stage: l.stage, from: 0, to: total });
    else if (last.stage !== l.stage) {
      last.to = l.at;
      segments.push({ stage: l.stage, from: l.at, to: total });
    }
  }

  // Speech: each recognised phrase ends at its timestamp and lasts about as long as its words take to say.
  const speech: Span[] = [];
  const coach: Span[] = [];
  let prevEnd = 0;
  lines.forEach((l, i) => {
    const dur = Math.min(25_000, Math.max(800, (wordCount(l.text) / WORDS_PER_SEC) * 1000));
    if (l.who === 'you') {
      const from = Math.max(prevEnd, l.at - dur);
      speech.push({ from, to: l.at, line: i });
      prevEnd = l.at;
    } else {
      coach.push({ from: l.at, to: l.at + dur, line: i });
    }
  });

  // Silence: stretches with neither you nor the coach talking.
  const gaps: { from: number; to: number }[] = [];
  if (d.mic) {
    const busy = [...speech, ...coach].sort((a, b) => a.from - b.from);
    let cursor = coach[0]?.to ?? 0;
    for (const b of busy) {
      if (b.from - cursor >= FILM_GAP_MS) gaps.push({ from: cursor, to: b.from });
      cursor = Math.max(cursor, b.to);
    }
    if (total - cursor >= FILM_GAP_MS) gaps.push({ from: cursor, to: total });
  }

  const moments: Moment[] = [];
  const lineAt = (at: number) => {
    let best: number | null = null;
    lines.forEach((l, i) => {
      if (best === null || Math.abs(l.at - at) < Math.abs(lines[best].at - at)) best = i;
    });
    return best;
  };
  if (metrics?.firstIdeaMs != null) moments.push({ at: metrics.firstIdeaMs, kind: 'idea', label: 'First idea out loud', line: lineAt(metrics.firstIdeaMs) });
  let complexities = 0;
  lines.forEach((l, i) => {
    if (l.who === 'you' && complexities < 3 && mentionsComplexity(l.text)) {
      complexities++;
      moments.push({ at: l.at, kind: 'complexity', label: `Complexity stated (${stageById(l.stage).title})`, line: i });
    }
    if (l.who === 'coach' && l.tag && MOMENT_LABEL[l.tag as MomentKind]) {
      moments.push({ at: l.at, kind: l.tag as MomentKind, label: `${MOMENT_LABEL[l.tag as MomentKind]}: “${short(l.text)}”`, line: i });
    }
  });
  const longest = gaps.reduce<{ from: number; to: number } | null>((a, g) => (!a || g.to - g.from > a.to - a.from ? g : a), null);
  if (longest) moments.push({ at: longest.from, kind: 'silence', label: `Went quiet for ${clock(longest.to - longest.from)}`, line: lineAt(longest.from) });
  const md = markedDown ? parseClock(markedDown.at) : null;
  if (markedDown && md !== null) moments.push({ at: md, kind: 'markedDown', label: `Marked down: ${markedDown.why}`, line: lineAt(md) });
  moments.sort((a, b) => a.at - b.at);
  return { total, segments, speech, coach, gaps, moments };
}

const short = (t: string) => (t.length > 70 ? `${t.slice(0, 68)}…` : t);

// ---------------------------------------------------------------- calibration

/**
 * What the evidence alone says, per signal, on the same 1-4 scale as the
 * self-score. Used as the yardstick when there is no AI write-up.
 */
export function signalScores(
  m: Metrics | null,
  t: TalkStats | null,
  ac: boolean,
  mistakes: MistakeKey[],
  blindHit: boolean | null,
): Scores | null {
  if (!m || !t?.mic) return null;
  const clamp = (n: number) => Math.max(1, Math.min(4, Math.round(n)));
  const talk = t.talkRatio >= 0.55 ? 4 : t.talkRatio >= 0.4 ? 3 : t.talkRatio >= 0.25 ? 2 : 1;
  const comm = talk - (m.codeSilenceMs > 60_000 ? 1 : 0) - (m.fillersPerMin > 6 ? 1 : 0);
  const idea = m.firstIdeaMs === null ? 1 : m.firstIdeaMs <= 8 * 60_000 ? 4 : m.firstIdeaMs <= 12 * 60_000 ? 3 : m.firstIdeaMs <= 16 * 60_000 ? 2 : 1;
  const solve = idea - (blindHit === false ? 1 : 0) - (mistakes.includes('wrong_pattern') ? 1 : 0);
  const bugs = mistakes.includes('bug') || mistakes.includes('off_by_one');
  const coding = ac ? (bugs ? 3 : 4) : bugs ? 1 : 2;
  const verify = (m.complexityInApproach && m.complexityInTest ? 4 : m.complexityInApproach || m.complexityInTest ? 3 : 1) - (mistakes.includes('missed_edge') ? 1 : 0);
  return { communication: clamp(comm), problemSolving: clamp(solve), coding: clamp(coding), verification: clamp(verify) };
}

export type CalibrationRow = { key: ScoreKey; self: number; bench: number; gap: number };

/** Self minus yardstick, per signal. Positive means you rate yourself higher than the evidence. */
export function calibrate(self: Scores | null, bench: Scores | null): CalibrationRow[] | null {
  if (!self || !bench || SCORE_KEYS.some((k) => !self[k] || !bench[k])) return null;
  return SCORE_KEYS.map((k) => ({ key: k, self: self[k], bench: bench[k], gap: self[k] - bench[k] }));
}

/** Calibration across your last rounds that have both a self-score and a yardstick. */
export function calibrationTrend(rounds: RoundFacts[], n = 10): { key: ScoreKey; gap: number; rounds: number }[] | null {
  const rows = [...rounds]
    .sort((a, b) => b.finishedAt.localeCompare(a.finishedAt))
    .map((r) => {
      const p = findProblem(r.slug);
      const hit = r.mode === 'blind' && p ? patternMatches(r.pattern, p.topic) : null;
      return calibrate(scored(r.scores) ? r.scores : null, r.aiScores ?? signalScores(r.metrics, r.talkStats, r.acAfterStart, r.mistakes, hit));
    })
    .filter((c): c is CalibrationRow[] => c !== null)
    .slice(0, n);
  if (rows.length === 0) return null;
  return SCORE_KEYS.map((k) => ({
    key: k,
    gap: Math.round((rows.reduce((sum, c) => sum + c.find((x) => x.key === k)!.gap, 0) / rows.length) * 10) / 10,
    rounds: rows.length,
  }));
}
