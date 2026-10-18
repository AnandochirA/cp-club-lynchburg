'use client';

import Link from 'next/link';
import { useState } from 'react';
import '../../app/dash.css';
import '../../app/interview.css';
import '../../app/behavioral.css';
import {
  COMPETENCIES,
  LOOP_SIZE,
  QUESTIONS,
  behavioralCopy as B,
  competencyByKey,
  questionById,
  type CompetencyKey,
  type Question,
} from '@/lib/behavioral-kit';
import { answerSignals, coverage, type BehavioralRound, type Story } from '@/lib/behavioral-logic';
import { pick } from '@/lib/interview-logic';
import { ago } from '@/lib/momentum';
import { useNow } from '../dash/hooks';
import { Icon } from '../icons';
import { Round } from './Round';
import { StoryBank } from './StoryBank';

/** Questions you have not answered recently come first, so a loop is not three repeats. */
function draw(n: number, rounds: BehavioralRound[], only?: CompetencyKey): Question[] {
  const seen = new Set(rounds.map((r) => r.questionId));
  const pool = QUESTIONS.filter((q) => !only || q.competency === only);
  const fresh = pool.filter((q) => !seen.has(q.id));
  const out: Question[] = [];
  const bag = [...(fresh.length >= n ? fresh : pool)];
  while (out.length < n && bag.length) {
    const q = pick(bag);
    bag.splice(bag.indexOf(q), 1);
    // A loop spreads across competencies, like a real interviewer's list.
    if (!only && out.some((x) => x.competency === q.competency) && bag.some((b) => !out.some((x) => x.competency === b.competency))) continue;
    out.push(q);
  }
  return out;
}

/**
 * The behavioral side of the Arena: practice a single question or a three
 * question loop out loud, and keep a bank of STAR stories tagged by the
 * competencies they cover.
 */
export function BehavioralStudio({ initialStories, initialRounds }: { initialStories: Story[]; initialRounds: BehavioralRound[] }) {
  const [tab, setTab] = useState<'practice' | 'bank'>('practice');
  const [stories, setStories] = useState(initialStories);
  const [rounds, setRounds] = useState(initialRounds);
  const [playing, setPlaying] = useState<Question[] | null>(null);
  const [newTag, setNewTag] = useState<CompetencyKey | null>(null);
  const now = useNow(60_000);
  const cov = coverage(stories);

  return (
    <div className="dash" style={{ ['--tier' as string]: '#c89bff' }}>
      <div className="dash-aurora" aria-hidden="true">
        <i />
        <i />
        <b className="hex-bg-ink" />
      </div>
      <header className="dash-bar">
        <Link href="/me" className="font-mono text-sm text-muted no-underline hover:text-text">
          ← My progress
        </Link>
        {!playing && (
          <div role="tablist" aria-label={B.title} className="flex gap-2">
            {(['practice', 'bank'] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`bar-btn ${tab === t ? 'primary' : ''}`}
              >
                {t === 'practice' ? B.practice : B.bank}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="dash-wrap">
        {playing ? (
          <Round
            questions={playing}
            stories={stories}
            onSaved={(r) => setRounds((rs) => [r, ...rs])}
            onExit={() => setPlaying(null)}
          />
        ) : (
          <>
            <section className="panel bh-hero flex flex-col gap-6 p-5 lg:p-8" aria-labelledby="bh-title">
              <div className="flex flex-col gap-2">
                <span className="eyebrow-m">{B.eyebrow}</span>
                <h1 id="bh-title" className="bh-title font-display caps m-0">
                  {B.title}
                </h1>
                <p className="m-0 max-w-[62ch] text-[16px] leading-[1.55] text-soft">{B.lead}</p>
              </div>
              <div className="flex flex-col gap-3">
                <span className="font-mono text-[12px] tracking-[0.12em] text-dim uppercase">
                  {B.coverage} · {cov.covered.length}/{COMPETENCIES.length}
                </span>
                <ul className="bh-cov m-0 list-none p-0" aria-label={B.coverageNote}>
                  {COMPETENCIES.map((c, i) => {
                    const on = cov.covered.includes(c.key);
                    return (
                      <li key={c.key} style={{ ['--n' as string]: i }}>
                        <button
                          type="button"
                          className="bh-hex"
                          data-on={on ? '1' : undefined}
                          onClick={() => {
                            setNewTag(on ? null : c.key);
                            setTab('bank');
                          }}
                          title={on ? c.title : `${c.title}: no story yet`}
                        >
                          <span className="bh-hex-shape" aria-hidden="true">
                            {on ? <Icon name="check" size={18} stroke={3} /> : '+'}
                          </span>
                          <span className="bh-hex-label font-mono">{c.title}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>

            {tab === 'practice' ? (
              <>
                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
                  <button type="button" className="door bh-door" onClick={() => setPlaying(draw(1, rounds))}>
                    <span className="door-kicker font-mono">1 question · ~4 min</span>
                    <span className="door-title font-display caps">{B.random}</span>
                    <span className="door-sub">30s to think, up to 4:00 to answer, then one follow-up.</span>
                    <span className="door-foot font-mono">
                      Start <Icon name="arrow" size={16} stroke={2.4} className="arrow" />
                    </span>
                  </button>
                  <button type="button" className="door bh-door bh-door-loop" onClick={() => setPlaying(draw(LOOP_SIZE, rounds))}>
                    <span className="door-kicker font-mono">{B.loopNote}</span>
                    <span className="door-title font-display caps">{B.loop}</span>
                    <span className="door-sub">Three competencies in a row, the way a hiring manager runs it.</span>
                    <span className="door-foot font-mono">
                      Start <Icon name="arrow" size={16} stroke={2.4} className="arrow" />
                    </span>
                  </button>
                </div>

                <section className="panel flex flex-col gap-3 p-5 lg:p-7" aria-label={B.pickCompetency}>
                  <span className="font-mono text-[12px] tracking-[0.12em] text-dim uppercase">{B.pickCompetency}</span>
                  <div className="flex flex-wrap gap-2">
                    {COMPETENCIES.map((c) => (
                      <button key={c.key} type="button" className="iv-chip-btn" onClick={() => setPlaying(draw(1, rounds, c.key))}>
                        {c.title}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="panel flex flex-col gap-3 p-5 lg:p-7" aria-label={B.recent}>
                  <h2 className="font-display caps m-0 text-[30px] leading-[0.95] font-black">{B.recent}</h2>
                  {rounds.length === 0 ? (
                    <p className="m-0 text-[14.5px] text-muted">{B.noRounds}</p>
                  ) : (
                    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                      {rounds.slice(0, 8).map((r) => {
                        const q = questionById(r.questionId);
                        const sig = r.metrics ? answerSignals(r.metrics) : [];
                        return (
                          <li key={r.id} className="recent-row bh-recent">
                            <span className="mode-tag font-mono">{q ? competencyByKey(q.competency).title : '?'}</span>
                            <span className="min-w-0 flex-grow truncate">{q?.text ?? r.questionId}</span>
                            <span className="bh-dots" aria-label={sig.map((s) => `${s.label}: ${s.grade}`).join(', ')}>
                              {sig.map((s) => (
                                <i key={s.key} data-grade={s.grade} />
                              ))}
                            </span>
                            {now !== null && (
                              <span className="font-mono hidden shrink-0 text-[12px] text-dim sm:inline">
                                {ago(new Date(r.createdAt).getTime(), now)}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              </>
            ) : (
              <StoryBank stories={stories} onChange={setStories} startTag={newTag} onStartTagUsed={() => setNewTag(null)} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
