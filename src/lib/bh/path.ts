/**
 * The Prep Path: the book's preparation roadmap as steps whose completion is
 * read from what you have actually done (stories, drills, rehearsals), never
 * ticked by hand. Also the readiness score and the "next thing to do".
 */
import { coverage } from './catalog';
import { type Finding, type Stage, diagnoseStory, stageRank, storyScore, storyStage } from './coach';
import { levelByKey } from './levels';
import type { BehavioralRound, Debrief, Profile } from './model';
import { type SignalKey, signalByKey } from './signals';
import type { Story } from './story';

export type Stats = {
  /** Story id → good rehearsal takes. */
  goodTakes: Record<number, number>;
  tmayGood: number;
  decode: { answered: number; correct: number };
  select: { answered: number; avgMs: number; best: number };
  scripts: string[];
  loops: number;
  splitOk: number;
  rounds: number;
};
/** Everything the behavioral page holds, as loaded from /api/behavioral/state. */
export type BhState = { stories: Story[]; profile: Profile; rounds: BehavioralRound[]; stats: Stats; debriefs: Debrief[] };

export const emptyStats = (): Stats => ({
  goodTakes: {},
  tmayGood: 0,
  decode: { answered: 0, correct: 0 },
  select: { answered: 0, avgMs: 0, best: 0 },
  scripts: [],
  loops: 0,
  splitOk: 0,
  rounds: 0,
});

export type Tab = 'path' | 'catalog' | 'practice' | 'playbook' | 'debriefs';
export type StepKey = 'decode' | 'mine' | 'cover' | 'detail' | 'scaffold' | 'big3' | 'defend' | 'asks' | 'practice' | 'debrief';
export type Step = {
  key: StepKey;
  n: number;
  title: string;
  why: string;
  done: boolean;
  have: number;
  need: number;
  next: string;
  go: { tab: Tab; mode?: string; storyId?: number; signal?: SignalKey };
};

export type StoryStatus = { findings: Finding[]; score: number; stage: Stage };

export function storyStatuses(stories: Story[], profile: Profile, stats: Stats, now: Date): Map<number, StoryStatus> {
  const ctx = { level: profile.level, values: profile.values.map((v) => v.name), now };
  const out = new Map<number, StoryStatus>();
  for (const s of stories) {
    const findings = diagnoseStory(s, ctx);
    out.set(s.id, { findings, score: storyScore(findings), stage: storyStage(s, findings, stats.goodTakes[s.id] ?? 0) });
  }
  return out;
}

export function prepPath(stories: Story[], profile: Profile, stats: Stats, debriefs: number, now: Date) {
  const lv = levelByKey(profile.level);
  const hurry = profile.hurry;
  const st = storyStatuses(stories, profile, stats, now);
  const core = stories.filter((s) => s.tier === 'core');
  const at = (s: Story, stage: Stage) => stageRank(st.get(s.id)!.stage) >= stageRank(stage);
  const cov = coverage(stories);
  const coreNeed = hurry ? Math.min(2, lv.coreTarget) : lv.coreTarget;
  const seedNeed = hurry ? coreNeed + 2 : lv.seedTarget;
  const decodeNeed = hurry ? 10 : 20;
  const steps: Step[] = [];
  const push = (s: Omit<Step, 'n'>) => steps.push({ ...s, n: steps.length + 1 });

  const acc = stats.decode.answered ? stats.decode.correct / stats.decode.answered : 0;
  push({
    key: 'decode',
    title: 'Learn what is scored',
    why: 'Every question scores one or more of eight signal areas. Spotting them is half the answer.',
    done: stats.decode.answered >= decodeNeed && acc >= 0.8,
    have: Math.min(stats.decode.answered, decodeNeed),
    need: decodeNeed,
    next: stats.decode.answered < decodeNeed ? `Signal Spotter: ${decodeNeed - stats.decode.answered} more questions` : `Signal Spotter accuracy is ${Math.round(acc * 100)}%; get it to 80%`,
    go: { tab: 'practice', mode: 'decode' },
  });

  const seeds = stories.length;
  push({
    key: 'mine',
    title: 'Mine your stories',
    why: 'A catalog beats memorized answers: you cannot predict the questions, but you can know your stories.',
    done: seeds >= seedNeed && core.length >= coreNeed,
    have: Math.min(seeds, seedNeed),
    need: seedNeed,
    next: seeds < seedNeed ? `Brainstorm ${seedNeed - seeds} more story seed${seedNeed - seeds === 1 ? '' : 's'}` : `Mark ${coreNeed - core.length} more as core (your biggest stories)`,
    go: { tab: 'catalog', mode: 'mine' },
  });

  if (!hurry)
    push({
      key: 'cover',
      title: 'Cover all eight areas',
      why: 'Every gap is a question you will freeze on.',
      done: cov.gaps.length === 0,
      have: cov.covered.length,
      need: 8,
      next: cov.gaps.length ? `Find a story that shows ${cov.gaps.length === 1 ? 'this area' : 'one of these'}: ${cov.gaps.map((k) => signalByKey(k).title).join(', ')}` : 'Covered',
      go: { tab: 'catalog', mode: 'mine', signal: cov.gaps[0] },
    });

  const detailed = core.filter((s) => at(s, 'detailed'));
  const firstUndetailed = core.find((s) => !at(s, 'detailed'));
  push({
    key: 'detail',
    title: 'Detail your core stories (CARL)',
    why: 'Most stories fail on detail: too few actions, no stakes, no evidence, no learnings.',
    done: core.length >= coreNeed && detailed.length === core.length,
    have: detailed.length,
    need: Math.max(coreNeed, core.length),
    next: firstUndetailed ? `Fix the blockers in “${firstUndetailed.title}”` : `Add ${coreNeed - core.length} more core stories`,
    go: firstUndetailed ? { tab: 'catalog', storyId: firstUndetailed.id } : { tab: 'catalog', mode: 'mine' },
  });

  if (!hurry) {
    const scaffolded = core.filter((s) => at(s, 'scaffolded'));
    const firstOpen = core.find((s) => at(s, 'detailed') && !at(s, 'scaffolded'));
    push({
      key: 'scaffold',
      title: 'Scaffold and defend them',
      why: 'Structure, prepared follow-ups and defended weak spots are what make a story hold up when they dig.',
      done: core.length >= coreNeed && scaffolded.length === core.length,
      have: scaffolded.length,
      need: Math.max(coreNeed, core.length),
      next: firstOpen ? `Scaffold “${firstOpen.title}”: table of contents, follow-ups, re-cuts, defense` : 'Detail your core stories first',
      go: firstOpen ? { tab: 'catalog', storyId: firstOpen.id } : { tab: 'catalog' },
    });
  }

  const t = profile.tmay;
  const tmayReady = !!t.summary && t.wins.length >= 2 && !!t.forward;
  const fav = stories.find((s) => s.id === profile.big3.favoriteId);
  const con = stories.find((s) => s.id === profile.big3.conflictId);
  const conOk = !!con && at(con, 'detailed') && profile.big3.conflictRight && profile.big3.conflictCentral;
  const tmayNeed = hurry ? 2 : 3;
  const big3Parts = [tmayReady, stats.tmayGood >= tmayNeed, !!fav, conOk];
  push({
    key: 'big3',
    title: 'Polish the Big Three',
    why: 'Tell me about yourself, your favorite project and a conflict come up in nearly every loop. They are the only answers worth polishing in advance.',
    done: big3Parts.every(Boolean),
    have: big3Parts.filter(Boolean).length,
    need: 4,
    next: !tmayReady
      ? 'Write your Tell-me-about-yourself'
      : stats.tmayGood < tmayNeed
        ? `Rehearse it out loud (${stats.tmayGood}/${tmayNeed} good takes)`
        : !fav
          ? 'Pick your favorite-project story'
          : !conOk
            ? 'Pick and check your conflict story'
            : 'Done',
    go: { tab: 'practice', mode: 'big3' },
  });

  const weakness = stories.find((s) => s.signals.includes('growth') && at(s, 'detailed') && s.learnings.some((l) => l.applied));
  push({
    key: 'defend',
    title: 'Ready a mistake story',
    why: 'Failure and weakness questions are near-certain. You need a real one, reasonable at the time, with proof you changed.',
    done: !!weakness,
    have: weakness ? 1 : 0,
    need: 1,
    next: 'Detail a Growth story with a learning you applied later',
    go: { tab: 'catalog', mode: 'mine', signal: 'growth' },
  });

  const roles = new Set(profile.asks.map((a) => a.role));
  const askHave = hurry ? Math.min(2, profile.asks.length) : (['manager', 'peer'] as const).filter((r) => roles.has(r)).length;
  push({
    key: 'asks',
    title: 'Prepare your questions',
    why: 'They judge you on what you ask. Bland questions waste the last five minutes.',
    done: askHave >= 2,
    have: askHave,
    need: 2,
    next: 'Write one question for a hiring manager and one for a teammate',
    go: { tab: 'practice', mode: 'big3' },
  });

  if (!hurry) {
    const parts = [stats.scripts.length >= 1, stats.select.answered >= 10 && stats.select.avgMs > 0 && stats.select.avgMs <= 15_000, stats.splitOk >= 3];
    push({
      key: 'practice',
      title: 'Practice the full loop',
      why: 'Hearing a question, picking the best story fast, and telling it with a good shape is a skill of its own.',
      done: parts.every(Boolean),
      have: parts.filter(Boolean).length,
      need: 3,
      next: !parts[1]
        ? `Select drill: pick stories in under 15s (${stats.select.answered}/10 done${stats.select.avgMs ? `, avg ${Math.round(stats.select.avgMs / 1000)}s` : ''})`
        : !parts[2]
          ? `Answer with C/A/R/L beats until the split looks right (${stats.splitOk}/3)`
          : 'Run a full mock script',
      go: { tab: 'practice', mode: !parts[1] ? 'select' : !parts[2] ? 'question' : 'loop' },
    });
  }

  const counted = steps;
  const readiness = Math.round((counted.reduce((n, s) => n + (s.done ? 1 : Math.min(0.9, s.have / Math.max(1, s.need))), 0) / counted.length) * 100);
  const next = counted.find((s) => !s.done) ?? null;
  return {
    steps,
    readiness,
    next,
    statuses: st,
    coverage: cov,
    debrief: { key: 'debrief' as const, title: 'After a real interview', done: debriefs > 0, have: debriefs },
  };
}
