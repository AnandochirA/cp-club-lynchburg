'use client';

import Link from 'next/link';
import '../../app/interview.css';
import { MISTAKES, RUBRIC, VERDICTS, interviewCopy } from '@/lib/interview-kit';
import { SCORE_KEYS, findProblem, type Arena as ArenaData } from '@/lib/interview-logic';
import { ago } from '@/lib/momentum';
import { Icon } from '../icons';
import { useNow } from './hooks';
import { Odometer } from './Odometer';
import { ReviewButton, submissionsUrl } from './ReviewButton';

const C = interviewCopy.arena;
const PART_COLOR: Record<string, string> = {
  volume: '#7cc4ff',
  score: '#52d68a',
  talk: '#f6c453',
  pattern: '#c89bff',
  backlog: '#ff8fa1',
};

/** Optional behavioral summary; the door only shows once there is one. */
export type BehavioralDoor = { stories: number; covered: string[]; gaps: string[]; rounds: number; readiness: number; next: string | null };

/**
 * The Arena: interview readiness, built from five visible parts, then the
 * three ways in (a blind draw, the redo queue, behavioral practice), then
 * what keeps breaking you. Shown even with no rounds yet, as the way to start.
 */
export function Arena({
  arena,
  behavioral,
  solved,
  onReviewed,
}: {
  arena: ArenaData | null;
  behavioral?: BehavioralDoor | null;
  /** Slugs you have solved: a due redo among them is reviewed, not solved again. */
  solved?: ReadonlySet<string>;
  onReviewed?: () => void;
}) {
  const now = useNow(60_000);
  if (!arena) return <section className="panel arena-skeleton" aria-hidden="true" />;

  const r = arena.readiness;
  const due = arena.redo.due;
  const next = arena.redo.upcoming[0];
  const weakest = arena.averages ? SCORE_KEYS.reduce((a, b) => (arena.averages![b] < arena.averages![a] ? b : a)) : null;
  const topMistakes = arena.mistakes.slice(0, 4);
  const maxMistake = topMistakes[0]?.count ?? 1;

  return (
    <section className="panel arena flex flex-col gap-7 p-5 lg:p-8" aria-labelledby="arena-title">
      <div className="arena-head">
        <div className="flex flex-col gap-1.5">
          <span className="eyebrow-m">{C.eyebrow}</span>
          <h2 id="arena-title" className="arena-title font-display caps m-0">
            {C.title}
          </h2>
        </div>

        <div className="arena-ready" aria-label={`${C.readiness}: ${r.score} of 100`}>
          <div className="flex items-end gap-3">
            <span className="arena-ready-n font-display">
              <Odometer value={r.score} pad={2} delay={300} />
            </span>
            <span className="flex flex-col gap-1 pb-2">
              <span className="font-mono text-[11.5px] tracking-[0.14em] text-white/55 uppercase">{C.readiness}</span>
              {arena.delta !== null && (
                <span className={`font-mono text-[13px] font-bold ${arena.delta >= 0 ? 'text-[#52D68A]' : 'text-[#FF8FA1]'}`}>
                  {arena.delta >= 0 ? '▲' : '▼'} {Math.abs(arena.delta)} {C.thisWeek}
                </span>
              )}
            </span>
          </div>
          {/* The formula, drawn: each part's slot is its maximum, the fill is what you have. */}
          <div className="arena-parts" role="list">
            {r.parts.map((p) => (
              <div key={p.key} role="listitem" className="arena-part" style={{ flexGrow: p.max, ['--pc' as string]: PART_COLOR[p.key] }}>
                <span className="arena-part-bar" aria-hidden="true">
                  <i style={{ width: `${(p.points / p.max) * 100}%` }} />
                </span>
                <span className="arena-part-label font-mono">
                  {p.label} <b>{p.points}</b>/{p.max}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`arena-doors ${behavioral ? 'three' : ''}`}>
        <Link href="/interview/draw" className="door door-blind" data-spot>
          <span className="door-deck" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="door-kicker font-mono">{C.blindKicker}</span>
          <span className="door-title font-display caps">{interviewCopy.blind.title}</span>
          <span className="door-sub">{C.blindSub}</span>
          <span className="door-foot font-mono">
            {arena.pattern.calls > 0 ? C.patternCalls(arena.pattern.hits, arena.pattern.calls) : C.noBlindYet}
            <Icon name="arrow" size={16} stroke={2.4} className="arrow" />
          </span>
        </Link>

        <div className="door door-redo" data-due={due.length > 0 ? '1' : undefined}>
          <span className="door-kicker font-mono">{C.redoKicker}</span>
          <span className="flex items-end gap-3">
            <span className="door-big font-display">
              <Odometer value={due.length} delay={450} />
            </span>
            <span className="door-title font-display caps pb-1">{C.dueToday}</span>
          </span>
          {due.length > 0 ? (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {due.slice(0, 3).map((d) => {
                const p = findProblem(d.slug);
                return (
                  <li key={d.slug} className="flex flex-col gap-1">
                    <Link href={`/interview/${d.slug}?mode=redo`} className="redo-row" data-overdue={d.overdue ? '1' : undefined}>
                      <span className="redo-box font-mono" aria-label={C.boxLabel(d.box)}>
                        {C.boxShort(d.box)}
                      </span>
                      <span className="min-w-0 flex-grow truncate">{p?.title ?? d.slug}</span>
                      {d.overdue && <span className="font-mono text-[11px] font-bold text-[#FF8FA1] uppercase">{C.overdue}</span>}
                      <Icon name="arrow" size={14} stroke={2.4} />
                    </Link>
                    {solved?.has(d.slug) && onReviewed && (
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1">
                        <a
                          href={submissionsUrl(d.slug)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={interviewCopy.reviewSolution.label(p?.title ?? d.slug)}
                          className="font-mono text-[12.5px] text-soft hover:text-text"
                        >
                          {interviewCopy.reviewSolution.cta}
                        </a>
                        <ReviewButton
                          slug={d.slug}
                          title={p?.title ?? d.slug}
                          onDone={onReviewed}
                          className="font-mono min-h-8 cursor-pointer border border-[#52D68A]/40 bg-[#52D68A]/10 px-2.5 text-[12px] text-[#52D68A] hover:bg-[#52D68A]/20"
                        />
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="door-sub m-0">
              {next && now !== null ? C.nextUp(findProblem(next.slug)?.title ?? next.slug, until(next.dueAt, now)) : C.redoEmpty}
            </p>
          )}
          <span className="door-foot font-mono">
            {C.mastered(arena.redo.mastered)} · {C.waiting(arena.redo.upcoming.length)}
          </span>
        </div>

        {behavioral && (
          <Link href="/behavioral" className="door door-behav" data-spot>
            <span className="door-kicker font-mono">{C.behavKicker}</span>
            <span className="door-title font-display caps">{C.behavTitle}</span>
            <span className="behav-hexes" aria-label={C.coverage(behavioral.covered.length, behavioral.covered.length + behavioral.gaps.length)}>
              {[...behavioral.covered.map((c) => [c, true] as const), ...behavioral.gaps.map((g) => [g, false] as const)].map(([c, on]) => (
                <i key={c} data-on={on ? '1' : undefined} title={c} />
              ))}
            </span>
            <span className="door-sub">
              {behavioral.next ? C.behavNext(behavioral.next) : behavioral.gaps.length > 0 ? C.gap(behavioral.gaps[0]) : C.allCovered}
            </span>
            <span className="door-foot font-mono">
              {C.ready(behavioral.readiness)} · {C.stories(behavioral.stories)} · {C.behavRounds(behavioral.rounds)}
              <Icon name="arrow" size={16} stroke={2.4} className="arrow" />
            </span>
          </Link>
        )}
      </div>

      {arena.total === 0 ? (
        <p className="m-0 max-w-[64ch] text-[15px] leading-[1.55] text-muted">{C.empty}</p>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-7 lg:grid-cols-3">
          <div className="flex flex-col gap-3">
            <h3 className="arena-h font-mono">{C.breaks}</h3>
            {topMistakes.length === 0 ? (
              <p className="m-0 text-[14px] text-muted">{C.noMistakes}</p>
            ) : (
              topMistakes.map((m, i) => (
                <div key={m.key} className="flex flex-col gap-1.5">
                  <span className="flex items-baseline justify-between gap-2 text-[14.5px]">
                    <span className={i === 0 ? 'font-semibold text-text' : 'text-soft'}>{MISTAKES[m.key]}</span>
                    <span className="font-mono text-[12.5px] text-dim">×{m.count}</span>
                  </span>
                  <span className="break-bar" data-top={i === 0 ? '1' : undefined} aria-hidden="true">
                    <i style={{ width: `${(m.count / maxMistake) * 100}%` }} />
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="arena-h font-mono">{C.scores}</h3>
            {RUBRIC.map((rb) => {
              const v = arena.averages?.[rb.key] ?? 0;
              return (
                <div key={rb.key} className="iv-dim flex flex-col gap-1.5" data-weak={weakest === rb.key ? '1' : undefined}>
                  <span className="flex items-baseline justify-between gap-2 text-[14.5px]">
                    <span className="text-soft">
                      {rb.title}
                      {weakest === rb.key && <span className="font-mono ml-2 text-[11px] text-gold uppercase">{C.weakest}</span>}
                    </span>
                    <span className="font-mono text-[12.5px] text-dim">{v ? v.toFixed(1) : '–'} / 4</span>
                  </span>
                  <span className="iv-dim-bar" aria-hidden="true">
                    <i style={{ width: `${(v / 4) * 100}%` }} />
                  </span>
                </div>
              );
            })}
            {arena.streak > 1 && <p className="font-mono m-0 text-[13px] text-[#52D68A]">{C.streak(arena.streak)}</p>}
            {(() => {
              const worst = arena.calibration?.reduce((a, b) => (Math.abs(b.gap) > Math.abs(a.gap) ? b : a));
              if (!worst || Math.abs(worst.gap) < 0.5) return arena.calibration ? <p className="m-0 text-[13px] text-muted">{C.calibrated}</p> : null;
              const title = RUBRIC.find((x) => x.key === worst.key)!.title;
              return (
                <p className="arena-calib m-0" data-dir={worst.gap > 0 ? 'over' : 'under'}>
                  {worst.gap > 0 ? C.overrate(title, worst.gap) : C.underrate(title, -worst.gap)}
                </p>
              );
            })()}
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="arena-h font-mono">{C.recent}</h3>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {arena.recent.map((rd) => {
                const p = findProblem(rd.slug);
                const v = rd.verdict ? VERDICTS[rd.verdict] : null;
                return (
                  <li key={rd.id}>
                    <Link href={`/interview/${rd.slug}`} className="recent-row">
                      <span className="min-w-0 flex-grow truncate">{p?.title ?? rd.slug}</span>
                      {rd.mode !== 'practice' && <span className="mode-tag font-mono">{rd.mode}</span>}
                      {v ? (
                        <span className="verdict on-ink" data-v={v.v}>
                          {v.label}
                        </span>
                      ) : (
                        <span className="verdict on-ink" data-v="wait">
                          {C.unscored}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
            {now !== null && arena.recent[0] && (
              <span className="font-mono text-[12px] text-dim">
                {C.lastRound} {ago(new Date(arena.recent[0].finishedAt).getTime(), now)}
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function until(iso: string, now: number) {
  const h = Math.max(1, Math.round((new Date(iso).getTime() - now) / 3_600_000));
  return h < 24 ? `${h}h` : `${Math.round(h / 24)}d`;
}
