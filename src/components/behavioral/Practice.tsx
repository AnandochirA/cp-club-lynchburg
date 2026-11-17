'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiPost } from '@/lib/client-api';
import { judgeSelection, rankStories, type Verdict } from '@/lib/bh/catalog';
import { STAGES, stageRank } from '@/lib/bh/coach';
import type { BehavioralRound, Persona } from '@/lib/bh/model';
import { type BQuestion, QTYPES, behind, qtypeTitle, questionText, questionsFor, valueQuestion } from '@/lib/bh/questions';
import { SIGNALS, type SignalKey, signalByKey } from '@/lib/bh/signals';
import type { Story } from '@/lib/bh/story';
import { ago } from '@/lib/momentum';
import type { Shared } from './BehavioralStudio';
import { BigThree } from './BigThree';
import { MockLoop } from './MockLoop';
import { Round } from './Round';
import { Arrow, Btn, Eyebrow, H2, SignalTags, mmss } from './ui';

type Mode = 'menu' | 'decode' | 'select' | 'rehearse' | 'question' | 'loop' | 'big3';
const pickOne = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];

/** Practice: from quick drills to a full mock interview, in the order the book recommends. */
export function Practice(props: Shared) {
  const { state, path, nav, go } = props;
  const [mode, setMode] = useState<Mode>('menu');
  useEffect(() => {
    if (nav.key && nav.mode && ['decode', 'select', 'rehearse', 'question', 'loop', 'big3'].includes(nav.mode)) setMode(nav.mode as Mode);
    else if (nav.key) setMode('menu');
  }, [nav.key, nav.mode]);

  const back = () => {
    setMode('menu');
    props.setFocus(false);
    void props.refresh();
  };

  if (mode === 'decode') return <DecodeDrill {...props} onBack={back} />;
  if (mode === 'select') return <SelectDrill {...props} onBack={back} />;
  if (mode === 'rehearse') return <Rehearse {...props} onBack={back} />;
  if (mode === 'question') return <QuestionMode {...props} onBack={back} />;
  if (mode === 'loop') return <MockLoop {...props} onBack={back} />;
  if (mode === 'big3') return <BigThree {...props} onBack={back} />;

  const s = state.stats;
  const doors: { mode: Mode; kicker: string; title: string; sub: string; foot: string }[] = [
    {
      mode: 'decode',
      kicker: 'Decode · 10 seconds each',
      title: 'Signal Spotter',
      sub: 'See a question, name its type and the signal areas behind it.',
      foot: s.decode.answered ? `${Math.round((s.decode.correct / s.decode.answered) * 100)}% of your last ${s.decode.answered}` : 'Start here',
    },
    {
      mode: 'select',
      kicker: 'Select · 15 seconds each',
      title: 'Story picker',
      sub: 'See a question, pick the best story from your catalog, see how the ranker would pick.',
      foot: s.select.answered ? `avg ${Math.round(s.select.avgMs / 1000)}s · ${s.select.best}/${s.select.answered} best` : 'Needs 2+ stories',
    },
    {
      mode: 'rehearse',
      kicker: 'Deliver · out loud',
      title: 'Rehearse a story',
      sub: 'Tell one of your stories while tapping C / A / R / L. Two good takes make it Rehearsed.',
      foot: `${Object.values(s.goodTakes).reduce((n, x) => n + x, 0)} good takes`,
    },
    {
      mode: 'big3',
      kicker: 'The Big Three',
      title: 'Yourself · Project · Conflict',
      sub: 'Build and rehearse the three answers you will be asked in almost every loop, plus your questions for them.',
      foot: `${s.tmayGood} good TMAY takes`,
    },
    {
      mode: 'question',
      kicker: 'Decode → Select → Deliver',
      title: 'Full question',
      sub: 'The whole loop on one question, with follow-ups aimed at your weak spots.',
      foot: `${s.rounds} answers so far`,
    },
    {
      mode: 'loop',
      kicker: 'Mock interview · 8–10 questions',
      title: 'Mock loop',
      sub: 'One of the book’s scripts, or a loop built from your gaps. Examiner or conversationalist.',
      foot: s.scripts.length ? `${s.scripts.length} script${s.scripts.length === 1 ? '' : 's'} done` : 'Run one before every interview',
    },
  ];

  return (
    <>
      <section className="panel bh-hero flex flex-col gap-3 p-5 lg:p-8" aria-labelledby="pr-title">
        <span className="eyebrow-m">Practice</span>
        <h1 id="pr-title" className="bh-title font-display caps m-0" style={{ fontSize: 'clamp(54px, 9vw, 104px)' }}>
          Practice
        </h1>
        <p className="m-0 max-w-[64ch] text-[15.5px] leading-[1.55] text-soft">
          Practice alone first, until your core stories and the Big Three come out clean, then drill the loop on questions you have not seen. Every question you cannot answer from your catalog shows you a gap.
        </p>
      </section>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2 xl:grid-cols-3">
        {doors.map((d) => (
          <button key={d.mode} type="button" className="door bh-door" data-next={path.next?.go.mode === d.mode ? '1' : undefined} onClick={() => (setMode(d.mode), go({ tab: 'practice', mode: d.mode }))}>
            <span className="door-kicker font-mono">{d.kicker}</span>
            <span className="door-title font-display caps">{d.title}</span>
            <span className="door-sub">{d.sub}</span>
            <span className="door-foot font-mono">
              {d.foot} <Arrow />
            </span>
          </button>
        ))}
      </div>
      <RecentRounds rounds={state.rounds} stories={state.stories} />
    </>
  );
}

type Sub = Shared & { onBack: () => void };

function RecentRounds({ rounds, stories }: { rounds: BehavioralRound[]; stories: Story[] }) {
  const [now] = useState(() => Date.now());
  return (
    <section className="panel flex flex-col gap-3 p-5 lg:p-7" aria-label="Recent answers">
      <H2>Recent answers</H2>
      {rounds.length === 0 ? (
        <p className="m-0 text-[14.5px] text-muted">Nothing yet.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {rounds.slice(0, 10).map((r) => (
            <li key={r.id} className="recent-row bh-recent">
              <span className="mode-tag font-mono">{r.kind === 'rehearse' ? 'Rehearse' : qtypeTitle(r.qtype)}</span>
              <span className="min-w-0 flex-grow truncate">
                {r.kind === 'rehearse' ? stories.find((s) => s.id === r.storyId)?.title ?? 'Story' : questionText(r.questionId)}
              </span>
              <span className="bh-dots" aria-label={(r.checks ?? []).map((c) => `${c.label}: ${c.grade}`).join(', ')}>
                {(r.checks ?? []).slice(0, 8).map((c, i) => (
                  <i key={i} data-grade={c.grade} />
                ))}
              </span>
              <span className="font-mono shrink-0 text-[12px] text-dim">{r.score || ''}</span>
              <span className="font-mono hidden shrink-0 text-[12px] text-dim sm:inline">{ago(new Date(r.createdAt).getTime(), now)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Questions eligible for drills: story questions at your level, plus your company-value questions. */
function useBank(state: Shared['state']) {
  return useMemo(() => {
    const base = questionsFor(state.profile.level).filter((q) => q.type === 'time' || q.type === 'values' || q.type === 'hypo');
    const vals = state.profile.values.map((v, i) => valueQuestion(v.name, v.signals, i));
    return [...base, ...vals];
  }, [state.profile]);
}

// ---------------------------------------------------------------- decode drill
function DecodeDrill({ state, onBack, go }: Sub) {
  const bank = useBank(state);
  const [q, setQ] = useState<BQuestion>(() => pickOne(bank));
  const [type, setType] = useState<BQuestion['type'] | null>(null);
  const [picked, setPicked] = useState<SignalKey[]>([]);
  const [start, setStart] = useState(() => Date.now());
  const [done, setDone] = useState<{ correct: boolean; ms: number } | null>(null);
  const [tally, setTally] = useState({ n: 0, ok: 0 });

  const check = () => {
    const hit = picked.filter((k) => q.signals.includes(k)).length;
    const correct = type === q.type && hit >= 1 && picked.length - hit <= 1;
    const ms = Date.now() - start;
    setDone({ correct, ms });
    setTally((t) => ({ n: t.n + 1, ok: t.ok + (correct ? 1 : 0) }));
    void apiPost('/api/behavioral/drills', { kind: 'decode', questionId: q.id, correct, ms, detail: { picked } });
  };
  const next = () => {
    let n = pickOne(bank);
    for (let i = 0; i < 5 && n.id === q.id; i++) n = pickOne(bank);
    setQ(n);
    setType(null);
    setPicked([]);
    setDone(null);
    setStart(Date.now());
  };

  return (
    <section className="panel flex flex-col gap-5 p-5 lg:p-8" aria-labelledby="dd-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Eyebrow>
            Signal Spotter · {tally.ok}/{tally.n} this session
          </Eyebrow>
          <H2 id="dd-title">What is it scoring?</H2>
        </div>
        <button type="button" className="iv-link" onClick={onBack}>
          Back
        </button>
      </div>
      <blockquote className="bh-quote font-display m-0">{q.text}</blockquote>
      <div className="flex flex-wrap gap-2">
        {QTYPES.filter((t) => t.key === 'time' || t.key === 'values' || t.key === 'hypo').map((t) => (
          <button key={t.key} type="button" disabled={!!done} className="iv-chip-btn" data-on={type === t.key ? '1' : undefined} data-right={done && t.key === q.type ? '1' : undefined} onClick={() => setType(t.key)}>
            {t.title}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {SIGNALS.map((a) => {
          const on = picked.includes(a.key);
          return (
            <button
              key={a.key}
              type="button"
              disabled={!!done}
              title={a.definition}
              className="iv-chip-btn"
              data-on={on ? '1' : undefined}
              data-right={done && q.signals.includes(a.key) ? '1' : undefined}
              data-wrong={done && on && !q.signals.includes(a.key) ? '1' : undefined}
              onClick={() => setPicked(on ? picked.filter((k) => k !== a.key) : picked.length >= 3 ? picked : [...picked, a.key])}
            >
              {a.title}
            </button>
          );
        })}
      </div>
      {!done ? (
        <Btn disabled={!type || !picked.length} onClick={check}>
          Check
        </Btn>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="bh-reveal m-0" data-ok={done.correct ? '1' : undefined}>
            <b>{done.correct ? 'Right' : 'Not quite'}</b> ({Math.round(done.ms / 1000)}s). {qtypeTitle(q.type)}: {QTYPES.find((t) => t.key === q.type)?.shape} Scoring{' '}
            {q.signals.map((k) => signalByKey(k).title).join(' + ')}. {behind(q)}
          </p>
          <div className="flex flex-wrap gap-3">
            <Btn onClick={next}>
              Next question <Arrow />
            </Btn>
            <button type="button" className="iv-link" onClick={() => go({ tab: 'playbook', concept: 'signals' })}>
              Review the signal areas
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- select drill
function SelectDrill({ state, onBack, go, now }: Sub) {
  const bank = useBank(state);
  const stories = state.stories;
  const [q, setQ] = useState<BQuestion>(() => pickOne(bank));
  const [start, setStart] = useState(() => Date.now());
  const [res, setRes] = useState<{ v: Verdict; ms: number } | null>(null);
  const [tally, setTally] = useState({ n: 0, best: 0, ms: 0 });
  const ranked = useMemo(() => rankStories(q.signals, stories, new Map(), 0, now), [q, stories, now]);

  if (stories.length < 2)
    return (
      <section className="panel flex flex-col gap-4 p-5 lg:p-8">
        <H2>Story picker</H2>
        <p className="m-0 text-[15px] text-muted">You need at least two stories in your catalog to practice picking between them.</p>
        <div className="flex gap-3">
          <Btn onClick={() => go({ tab: 'catalog', mode: 'mine' })}>Mine stories</Btn>
          <button type="button" className="iv-link" onClick={onBack}>
            Back
          </button>
        </div>
      </section>
    );

  const choose = (id: number | null) => {
    const ms = Date.now() - start;
    const v = judgeSelection(id, ranked);
    setRes({ v, ms });
    setTally((t) => ({ n: t.n + 1, best: t.best + (v.grade === 'best' ? 1 : 0), ms: t.ms + ms }));
    void apiPost('/api/behavioral/drills', { kind: 'select', questionId: q.id, correct: v.grade === 'best' || v.grade === 'close', ms, detail: { grade: v.grade, picked: id ? [id] : [] } });
  };
  const next = () => {
    let n = pickOne(bank);
    for (let i = 0; i < 5 && n.id === q.id; i++) n = pickOne(bank);
    setQ(n);
    setRes(null);
    setStart(Date.now());
  };

  return (
    <section className="panel flex flex-col gap-5 p-5 lg:p-8" aria-labelledby="sd-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Eyebrow>
            Story picker · {tally.best}/{tally.n} best{tally.n ? ` · avg ${Math.round(tally.ms / tally.n / 1000)}s` : ''}
          </Eyebrow>
          <H2 id="sd-title">Which story?</H2>
        </div>
        <button type="button" className="iv-link" onClick={onBack}>
          Back
        </button>
      </div>
      <blockquote className="bh-quote font-display m-0">{q.text}</blockquote>
      {!res ? (
        <>
          <ul className="bh-pick m-0 list-none p-0">
            {stories.map((s) => (
              <li key={s.id}>
                <button type="button" className="bh-pick-btn" onClick={() => choose(s.id)}>
                  <span className="text-[15.5px] font-semibold text-text">
                    {s.tier === 'core' && <span className="text-[var(--tier)]">★ </span>}
                    {s.title}
                  </span>
                  <SignalTags keys={s.signals} />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="iv-link w-fit" onClick={() => choose(null)}>
            Nothing fits
          </button>
        </>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="m-0 text-[14px] text-muted">
            This question scores <SignalTags keys={q.signals} /> · you took {Math.round(res.ms / 1000)}s
          </p>
          <p className="bh-reveal m-0" data-ok={res.v.grade === 'best' || res.v.grade === 'close' ? '1' : undefined}>
            <b>{{ best: 'Best pick.', close: 'Good pick.', better: 'There was a stronger one.', none: 'Gap in your catalog.' }[res.v.grade]}</b> {res.v.note}
          </p>
          {ranked[0]?.relevance > 0 && (
            <ol className="m-0 flex flex-col gap-1.5 pl-5 text-[14px] text-soft">
              {ranked.slice(0, 3).map((r) => (
                <li key={r.story.id}>
                  <b className="text-text">{r.story.title}</b>: {r.reasons.join(' · ')}
                </li>
              ))}
            </ol>
          )}
          <div className="flex flex-wrap gap-3">
            <Btn onClick={next}>
              Next question <Arrow />
            </Btn>
            {res.v.grade === 'none' && (
              <Btn kind="ghost" onClick={() => go({ tab: 'catalog', mode: 'mine', signal: q.signals[0] })}>
                Mine a story for {signalByKey(q.signals[0]).title}
              </Btn>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- rehearse
function Rehearse({ state, path, onBack, go, setFocus, now, refresh }: Sub) {
  const [story, setStory] = useState<Story | null>(null);
  const [n, setN] = useState(0);
  const order = [...state.stories].sort((a, b) => {
    const sa = path.statuses.get(a.id)!.stage;
    const sb = path.statuses.get(b.id)!.stage;
    const ra = sa === 'scaffolded' ? 0 : sa === 'detailed' ? 1 : sa === 'rehearsed' ? 2 : 3;
    const rb = sb === 'scaffolded' ? 0 : sb === 'detailed' ? 1 : sb === 'rehearsed' ? 2 : 3;
    return ra - rb || (a.tier === 'core' ? -1 : 1);
  });
  if (story)
    return (
      <Round
        key={`${story.id}-${n}`}
        question={{ id: 'rehearse', text: `Tell me about “${story.title}”.`, type: 'time', signals: story.signals }}
        stories={state.stories}
        profile={state.profile}
        kind="rehearse"
        story={story}
        label="Rehearsal"
        nextLabel="Another take"
        now={now}
        go={go}
        onSaved={() => void refresh()}
        onNext={() => setN(n + 1)}
        onExit={() => {
          setFocus(false);
          setStory(null);
        }}
      />
    );
  return (
    <section className="panel flex flex-col gap-5 p-5 lg:p-8" aria-labelledby="rh-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Eyebrow>Solo practice · record yourself</Eyebrow>
          <H2 id="rh-title">Rehearse a story</H2>
        </div>
        <button type="button" className="iv-link" onClick={onBack}>
          Back
        </button>
      </div>
      <p className="m-0 max-w-[66ch] text-[14.5px] leading-[1.55] text-soft">
        Tell it out loud as if to an interviewer. Tap <b>C</b>, <b>A</b>, <b>R</b>, <b>L</b> (or keys 1–4) as you move between parts, which is how the split gets measured. You will notice a big difference by the third take.
      </p>
      {order.length === 0 ? (
        <Btn onClick={() => go({ tab: 'catalog', mode: 'mine' })}>Mine your first story</Btn>
      ) : (
        <ul className="bh-pick m-0 list-none p-0">
          {order.map((s) => {
            const st = path.statuses.get(s.id)!;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  className="bh-pick-btn"
                  onClick={() => {
                    setFocus(true);
                    setStory(s);
                  }}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-[15.5px] font-semibold text-text">
                      {s.tier === 'core' && <span className="text-[var(--tier)]">★ </span>}
                      {s.title}
                    </span>
                    <span className="bh-stage font-mono" data-stage={st.stage}>
                      {STAGES.find((x) => x.key === st.stage)?.title}
                    </span>
                  </span>
                  <span className="font-mono text-[12px] text-dim">
                    {state.stats.goodTakes[s.id] ?? 0} good take{(state.stats.goodTakes[s.id] ?? 0) === 1 ? '' : 's'}
                    {stageRank(st.stage) < stageRank('detailed') && ' · detail it first for a better take'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- full question
function QuestionMode({ state, path, onBack, go, setFocus, now, refresh }: Sub) {
  const bank = useBank(state);
  const [filter, setFilter] = useState<{ signal: SignalKey | null; type: BQuestion['type'] | null }>({ signal: null, type: null });
  const [persona, setPersona] = useState<Persona>('none');
  const [q, setQ] = useState<BQuestion | null>(null);
  const [n, setN] = useState(0);

  const draw = () => {
    const seen = new Set(state.rounds.map((r) => r.questionId));
    let pool = bank.filter((x) => (!filter.signal || x.signals.includes(filter.signal)) && (!filter.type || x.type === filter.type));
    // No filter: lean toward your coverage gaps and questions you have not answered.
    if (!filter.signal && !filter.type && path.coverage.gaps.length) {
      const gapQs = pool.filter((x) => x.signals.some((k) => path.coverage.gaps.includes(k)));
      if (gapQs.length && Math.random() < 0.5) pool = gapQs;
    }
    const fresh = pool.filter((x) => !seen.has(x.id));
    setQ(pickOne(fresh.length ? fresh : pool.length ? pool : bank));
    setN((x) => x + 1);
    setFocus(true);
  };

  if (q)
    return (
      <Round
        key={`${q.id}-${n}`}
        question={q}
        stories={state.stories}
        profile={state.profile}
        kind="question"
        decode
        select
        persona={persona}
        nextLabel="Another question"
        now={now}
        go={go}
        onSaved={() => void refresh()}
        onNext={draw}
        onExit={() => {
          setFocus(false);
          setQ(null);
        }}
      />
    );

  return (
    <section className="panel flex flex-col gap-5 p-5 lg:p-8" aria-labelledby="fq-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Eyebrow>Decode → Select → Deliver</Eyebrow>
          <H2 id="fq-title">Full question</H2>
        </div>
        <button type="button" className="iv-link" onClick={onBack}>
          Back
        </button>
      </div>
      <div className="flex flex-col gap-2">
        <Eyebrow>Signal area (optional)</Eyebrow>
        <div className="flex flex-wrap gap-2">
          {SIGNALS.map((a) => (
            <button key={a.key} type="button" className="iv-chip-btn" data-on={filter.signal === a.key ? '1' : undefined} onClick={() => setFilter((f) => ({ ...f, signal: f.signal === a.key ? null : a.key }))}>
              {a.title}
              {path.coverage.gaps.includes(a.key) && ' ·gap'}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Eyebrow>Question type (optional)</Eyebrow>
        <div className="flex flex-wrap gap-2">
          {QTYPES.filter((t) => t.key === 'time' || t.key === 'values' || t.key === 'hypo').map((t) => (
            <button key={t.key} type="button" className="iv-chip-btn" data-on={filter.type === t.key ? '1' : undefined} onClick={() => setFilter((f) => ({ ...f, type: f.type === t.key ? null : t.key }))}>
              {t.title}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Eyebrow>Interviewer</Eyebrow>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['none', 'Standard', 'A branch and a leaf follow-up.'],
              ['examiner', 'Examiner', 'Cuts in at 1:15. Practice leading with the headline.'],
              ['conversationalist', 'Conversationalist', 'Lets you run. Practice managing your own time.'],
            ] as const
          ).map(([k, t, d]) => (
            <button key={k} type="button" className="iv-chip-btn" title={d} data-on={persona === k ? '1' : undefined} onClick={() => setPersona(k)}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <Btn onClick={draw}>
        Draw a question <Arrow />
      </Btn>
      <p className="m-0 text-[13px] text-dim">
        Leave both open and about half your questions come from areas your catalog does not cover yet: {path.coverage.gaps.map((k) => signalByKey(k).title).join(', ') || 'none, nice'}. Thinking time: {mmss(30)}.
      </p>
    </section>
  );
}
