'use client';

import { useMemo, useState } from 'react';
import { type Finding, STAGES, type Section, diagnoseStory, storyScore, storyStage } from '@/lib/bh/coach';
import { DURATIONS, levelByKey, type Duration } from '@/lib/bh/levels';
import { FOLLOWUP_SET } from '@/lib/bh/questions';
import { signalByKey } from '@/lib/bh/signals';
import {
  ACTION_THEMES,
  LEARNING_KINDS,
  LIMITS,
  MAX_FIELD,
  MAX_ITEM,
  MAX_SHORT,
  MAX_TITLE,
  RESULT_KINDS,
  SOURCES,
  type ActionTheme,
  type LearningKind,
  type ResultKind,
  type Source,
  type StoryInput,
  toldText,
} from '@/lib/bh/story';
import { speakSeconds, wordCount } from '@/lib/bh/text';
import type { Profile } from '@/lib/bh/model';
import { Icon } from '../icons';
import { Doctor } from './Doctor';
import { Area, Btn, ConceptLink, Eyebrow, Field, type Go, H2, Input, SignalPicker, mmss } from './ui';

export type EditStage = 'seed' | 'detail' | 'scaffold' | 'defend';
const EDIT_STAGES: { key: EditStage; title: string; sections: Section[]; note: string }[] = [
  { key: 'seed', title: '1 · Seed', sections: ['seed'], note: 'What happened, when, how big, and what it proves.' },
  { key: 'detail', title: '2 · Detail', sections: ['context', 'actions', 'results', 'learnings'], note: 'Context with stakes, every action you took, evidence, learnings.' },
  { key: 'scaffold', title: '3 · Scaffold', sections: ['scaffold'], note: 'Structure for telling it, and the follow-ups you will get.' },
  { key: 'defend', title: '4 · Defend', sections: ['defense'], note: 'How an uncharitable interviewer could read it, and your answer.' },
];

function ListRemove({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="iv-link shrink-0" onClick={onClick} aria-label="Remove">
      Remove
    </button>
  );
}

/**
 * Editing one story, in four guided stages that follow the book: identify it,
 * extract the detail (CARL), scaffold the telling, defend the weak spots.
 * The Story Doctor re-reads the draft on every change.
 */
export function StoryEditor({
  id,
  initial,
  profile,
  goodTakes,
  now,
  go,
  busy,
  onSave,
  onDelete,
  onClose,
  startStage = 'seed',
}: {
  id: number | null;
  initial: StoryInput;
  profile: Profile;
  goodTakes: number;
  now: Date;
  go: (g: Go) => void;
  busy: boolean;
  onSave: (s: StoryInput) => void;
  onDelete: (() => void) | null;
  onClose: () => void;
  startStage?: EditStage;
}) {
  const [v, setV] = useState<StoryInput>(initial);
  const [stage, setStage] = useState<EditStage>(startStage);
  const set = (patch: Partial<StoryInput>) => setV((x) => ({ ...x, ...patch }));
  const dirty = JSON.stringify(v) !== JSON.stringify(initial);

  const findings = useMemo(() => diagnoseStory(v, { level: profile.level, values: profile.values.map((x) => x.name), now }), [v, profile, now]);
  const score = storyScore(findings);
  const st = storyStage(v, findings, goodTakes);
  const cur = EDIT_STAGES.find((s) => s.key === stage)!;
  const here = findings.filter((f) => cur.sections.includes(f.section));
  const openIn = (s: (typeof EDIT_STAGES)[number]) => findings.filter((f) => s.sections.includes(f.section) && !f.ack && f.severity !== 'tip').length;
  const defend = (fid: string, framing: string | null) => {
    const d = { ...v.defense };
    if (framing) d[fid] = framing;
    else delete d[fid];
    set({ defense: d });
  };

  const words = wordCount(toldText(v));
  const secs = speakSeconds(words);
  const share = (n: number) => (words ? Math.round((n / words) * 100) : 0);
  const cW = wordCount(v.context.told);
  const aW = wordCount(v.actions.map((a) => a.text).join(' '));
  const rlW = words - cW - aW;
  const lv = levelByKey(profile.level);

  return (
    <section className="panel flex flex-col gap-5 p-5 lg:p-8" aria-labelledby="story-edit">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Eyebrow>{id ? 'Edit story' : 'New story'}</Eyebrow>
          <H2 id="story-edit">{v.title || 'Untitled story'}</H2>
        </div>
        <div className="flex items-center gap-3">
          <span className="bh-stage font-mono" data-stage={st}>
            {STAGES.find((s) => s.key === st)?.title}
          </span>
          <span className="bh-score font-display" title="Story Doctor score">
            {score}
          </span>
        </div>
      </div>

      {v.todos.some((t) => !t.done) && (
        <div className="bh-todos flex flex-col gap-2">
          <Eyebrow>From your debriefs</Eyebrow>
          {v.todos.map((t) => (
            <label key={t.id} className="flex items-start gap-3 text-[14.5px] text-soft">
              <input type="checkbox" checked={t.done} onChange={() => set({ todos: v.todos.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)) })} />
              <span className={t.done ? 'text-dim line-through' : ''}>{t.text}</span>
            </label>
          ))}
        </div>
      )}

      <nav className="bh-stagebar" aria-label="Story stages">
        {EDIT_STAGES.map((s) => {
          const n = openIn(s);
          return (
            <button key={s.key} type="button" aria-current={stage === s.key ? 'step' : undefined} onClick={() => setStage(s.key)}>
              <span className="font-mono">{s.title}</span>
              {n > 0 ? <i data-n>{n}</i> : <i>✓</i>}
            </button>
          );
        })}
      </nav>
      <p className="m-0 text-[14px] text-muted">{cur.note}</p>

      <div className="bh-edit">
        <div className="flex min-w-0 flex-col gap-5">
          {stage === 'seed' && (
            <>
              <Field label="Title" hint="A name only you need to recognize.">
                <Input value={v.title} onChange={(title) => set({ title })} max={MAX_TITLE} placeholder="The capstone demo that almost broke" />
              </Field>
              <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-3">
                <Field label="Where">
                  <select className="iv-input" value={v.source} onChange={(e) => set({ source: e.target.value as Source })}>
                    {SOURCES.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="When">
                  <Input type="month" value={v.when} onChange={(when) => set({ when })} />
                </Field>
                <Field label="Your role, team">
                  <Input value={v.setting} onChange={(setting) => set({ setting })} max={MAX_SHORT} placeholder="Backend intern, payments team" />
                </Field>
              </div>
              <Field label="Core or supporting?" hint="Core: the 2–4 stories you most want a hiring manager to hear. They get the full treatment.">
                <div className="flex flex-wrap gap-2">
                  {(['core', 'supporting'] as const).map((t) => (
                    <label key={t} className="iv-chip bh-tag">
                      <input type="radio" name="tier" checked={v.tier === t} onChange={() => set({ tier: t })} />
                      <span>{t === 'core' ? 'Core story' : 'Supporting story'}</span>
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="What it proves" hint="The 1–3 signal areas it shows best.">
                <SignalPicker value={v.signals} onChange={(signals) => set({ signals })} max={4} />
              </Field>
              <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
                <legend className="mb-2 p-0 text-[15px] font-semibold text-text">How big was it?</legend>
                <p className="m-0 -mt-1 text-[12.5px] text-dim">
                  Interviewers size your scope from this. At {lv.title} work usually runs {lv.typical}.
                </p>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                  <label className="flex flex-col gap-1.5">
                    <Eyebrow>Ran for</Eyebrow>
                    <select className="iv-input" value={v.scale.duration} onChange={(e) => set({ scale: { ...v.scale, duration: e.target.value as Duration | '' } })}>
                      <option value="">–</option>
                      {DURATIONS.map((d) => (
                        <option key={d.key} value={d.key}>
                          {d.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <Eyebrow>People</Eyebrow>
                    <input className="iv-input" type="number" min={0} value={v.scale.people || ''} onChange={(e) => set({ scale: { ...v.scale, people: Math.max(0, Number(e.target.value) || 0) } })} />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <Eyebrow>Teams</Eyebrow>
                    <input className="iv-input" type="number" min={0} value={v.scale.teams || ''} onChange={(e) => set({ scale: { ...v.scale, teams: Math.max(0, Number(e.target.value) || 0) } })} />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <Eyebrow>Your part (1–5)</Eyebrow>
                    <select className="iv-input" value={v.scale.contribution} onChange={(e) => set({ scale: { ...v.scale, contribution: Number(e.target.value) } })}>
                      <option value={0}>–</option>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n === 5 ? '5 · I drove it' : n === 1 ? '1 · minor' : n}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <Eyebrow>Impact (1–5)</Eyebrow>
                    <select className="iv-input" value={v.scale.impact} onChange={(e) => set({ scale: { ...v.scale, impact: Number(e.target.value) } })}>
                      <option value={0}>–</option>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n === 5 ? '5 · major' : n === 1 ? '1 · small' : n}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </fieldset>
            </>
          )}

          {stage === 'detail' && (
            <>
              <div className="flex flex-col gap-3">
                <span className="flex flex-wrap items-baseline gap-3">
                  <b className="bh-field-letter font-display">C</b>
                  <span className="text-[17px] font-semibold text-text">Context</span>
                  <ConceptLink concept="stakes" go={go}>
                    Raise the stakes →
                  </ConceptLink>
                </span>
                <Field label="What you say" hint={`${cW} words. Two or three sentences: the situation, your role, and what was at stake.`}>
                  <Area value={v.context.told} onChange={(told) => set({ context: { ...v.context, told } })} rows={3} max={MAX_FIELD} placeholder="Our checkout failed for 5% of users two days before launch, and I was the only engineer who knew the payments code…" />
                </Field>
                <details className="bh-details">
                  <summary className="font-mono">Detail in reserve (for follow-ups)</summary>
                  <div className="grid grid-cols-[minmax(0,1fr)] gap-3 pt-3 md:grid-cols-2">
                    {(
                      [
                        ['stakes', 'Stakes', 'What would have gone wrong? What was it worth?'],
                        ['constraints', 'Constraints', 'Time, people, budget, rules you were stuck with.'],
                        ['people', 'Who was involved', 'Who, what they wanted, the politics.'],
                        ['alternatives', 'Alternatives', 'Approaches you considered and rejected, and why.'],
                      ] as const
                    ).map(([k, label, hint]) => (
                      <Field key={k} label={label} hint={hint}>
                        <Area value={v.context[k]} onChange={(x) => set({ context: { ...v.context, [k]: x } })} rows={2} max={MAX_FIELD} />
                      </Field>
                    ))}
                  </div>
                </details>
              </div>

              <div className="flex flex-col gap-3">
                <span className="flex flex-wrap items-baseline gap-3">
                  <b className="bh-field-letter font-display">A</b>
                  <span className="text-[17px] font-semibold text-text">Actions</span>
                  <span className="text-[12.5px] text-dim">
                    {v.actions.length} · aim for {v.tier === 'core' ? lv.minActions : Math.max(2, lv.minActions - 1)}+, each starting with “I”
                  </span>
                </span>
                {v.actions.map((a, i) => (
                  <div key={i} className="bh-row">
                    <Area value={a.text} onChange={(text) => set({ actions: v.actions.map((x, j) => (j === i ? { ...x, text } : x)) })} rows={2} max={MAX_ITEM} placeholder="I…" />
                    <div className="flex items-center gap-3">
                      <select className="iv-input bh-select-sm" value={a.theme} onChange={(e) => set({ actions: v.actions.map((x, j) => (j === i ? { ...x, theme: e.target.value as ActionTheme | '' } : x)) })}>
                        <option value="">Theme…</option>
                        {ACTION_THEMES.map((t) => (
                          <option key={t.key} value={t.key}>
                            {t.title}
                          </option>
                        ))}
                      </select>
                      <ListRemove onClick={() => set({ actions: v.actions.filter((_, j) => j !== i) })} />
                    </div>
                  </div>
                ))}
                {v.actions.length < LIMITS.actions && (
                  <div className="flex flex-col gap-2">
                    <span className="text-[13px] text-dim">Add an action. Each theme below prompts you to remember what you did:</span>
                    <div className="flex flex-wrap gap-2">
                      {ACTION_THEMES.map((t) => {
                        const used = v.actions.some((a) => a.theme === t.key);
                        return (
                          <button
                            key={t.key}
                            type="button"
                            className="iv-chip-btn bh-theme"
                            data-used={used ? '1' : undefined}
                            title={t.prompt}
                            onClick={() => set({ actions: [...v.actions, { text: '', theme: t.key }] })}
                          >
                            + {t.title}
                          </button>
                        );
                      })}
                    </div>
                    {(() => {
                      const last = v.actions[v.actions.length - 1];
                      const t = last && !last.text && ACTION_THEMES.find((x) => x.key === last.theme);
                      return t ? <p className="m-0 text-[13.5px] text-soft">{t.prompt}</p> : null;
                    })()}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <span className="flex flex-wrap items-baseline gap-3">
                  <b className="bh-field-letter font-display">R</b>
                  <span className="text-[17px] font-semibold text-text">Results</span>
                  <ConceptLink concept="results" go={go}>
                    No numbers? →
                  </ConceptLink>
                </span>
                {v.results.map((r, i) => (
                  <div key={i} className="bh-row">
                    <Area value={r.text} onChange={(text) => set({ results: v.results.map((x, j) => (j === i ? { ...x, text } : x)) })} rows={2} max={MAX_ITEM} placeholder="What changed, and how do you know?" />
                    <div className="flex items-center gap-3">
                      <select className="iv-input bh-select-sm" value={r.kind} onChange={(e) => set({ results: v.results.map((x, j) => (j === i ? { ...x, kind: e.target.value as ResultKind } : x)) })}>
                        {RESULT_KINDS.map((k) => (
                          <option key={k.key} value={k.key}>
                            {k.title}
                          </option>
                        ))}
                      </select>
                      <ListRemove onClick={() => set({ results: v.results.filter((_, j) => j !== i) })} />
                    </div>
                  </div>
                ))}
                {v.results.length < LIMITS.results && (
                  <Btn kind="ghost" onClick={() => set({ results: [...v.results, { text: '', kind: v.signals.includes('conflict') && !v.results.some((r) => r.kind === 'relationship') ? 'relationship' : 'metric' }] })}>
                    <Icon name="plus" size={15} stroke={2.4} /> Add a result
                  </Btn>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <span className="flex flex-wrap items-baseline gap-3">
                  <b className="bh-field-letter font-display">L</b>
                  <span className="text-[17px] font-semibold text-text">Learnings</span>
                </span>
                {v.learnings.map((l, i) => (
                  <div key={i} className="bh-row">
                    <Area value={l.text} onChange={(text) => set({ learnings: v.learnings.map((x, j) => (j === i ? { ...x, text } : x)) })} rows={2} max={MAX_ITEM} placeholder="What you learned, specifically" />
                    <Area value={l.applied} onChange={(applied) => set({ learnings: v.learnings.map((x, j) => (j === i ? { ...x, applied } : x)) })} rows={1} max={MAX_ITEM} placeholder="When did you use it again? (evidence you changed)" />
                    <div className="flex items-center gap-3">
                      <select className="iv-input bh-select-sm" value={l.kind} onChange={(e) => set({ learnings: v.learnings.map((x, j) => (j === i ? { ...x, kind: e.target.value as LearningKind | '' } : x)) })}>
                        <option value="">Kind…</option>
                        {LEARNING_KINDS.map((k) => (
                          <option key={k.key} value={k.key}>
                            {k.title}
                          </option>
                        ))}
                      </select>
                      <ListRemove onClick={() => set({ learnings: v.learnings.filter((_, j) => j !== i) })} />
                    </div>
                  </div>
                ))}
                {v.learnings.length < LIMITS.learnings && (
                  <Btn kind="ghost" onClick={() => set({ learnings: [...v.learnings, { text: '', kind: '', applied: '' }] })}>
                    <Icon name="plus" size={15} stroke={2.4} /> Add a learning
                  </Btn>
                )}
              </div>
            </>
          )}

          {stage === 'scaffold' && (
            <>
              <div className="flex flex-col gap-2">
                <Eyebrow>Out loud: about {mmss(secs)} · target 2:00</Eyebrow>
                <div className="bh-split" aria-label={`Context ${share(cW)}%, actions ${share(aW)}%, results and learnings ${share(rlW)}%`}>
                  <i data-b="c" style={{ flexGrow: Math.max(1, cW) }}>
                    C {share(cW)}%
                  </i>
                  <i data-b="a" style={{ flexGrow: Math.max(1, aW) }}>
                    A {share(aW)}%
                  </i>
                  <i data-b="r" style={{ flexGrow: Math.max(1, rlW) }}>
                    R+L {share(rlW)}%
                  </i>
                </div>
                <span className="text-[12.5px] text-dim">Aim for about 10 / 60 / 30.</span>
              </div>

              <div className="flex flex-col gap-3">
                <span className="flex flex-wrap items-baseline gap-3">
                  <span className="text-[17px] font-semibold text-text">Table of contents</span>
                  <ConceptLink concept="toc" go={go}>
                    How →
                  </ConceptLink>
                </span>
                <p className="m-0 text-[13.5px] text-muted">
                  For long stories: 2–4 themes you announce right after the context. Each takeaway says what the listener should conclude about you.
                </p>
                <div className="flex flex-wrap gap-2">
                  {(['theme', 'chrono'] as const).map((o) => (
                    <label key={o} className="iv-chip bh-tag">
                      <input type="radio" name="toco" checked={v.tocOrder === o} onChange={() => set({ tocOrder: o })} />
                      <span>{o === 'theme' ? 'By what it proves' : 'In time order'}</span>
                    </label>
                  ))}
                </div>
                {v.toc.map((t, i) => (
                  <div key={i} className="grid grid-cols-[minmax(0,1fr)] gap-2 md:grid-cols-[1fr_1.4fr_auto] md:items-center">
                    <Input value={t.theme} onChange={(theme) => set({ toc: v.toc.map((x, j) => (j === i ? { ...x, theme } : x)) })} placeholder="Theme (e.g. Winning over the skeptic)" max={MAX_SHORT} />
                    <Input value={t.takeaway} onChange={(takeaway) => set({ toc: v.toc.map((x, j) => (j === i ? { ...x, takeaway } : x)) })} placeholder="Takeaway (e.g. I change minds with data, not volume)" max={MAX_SHORT} />
                    <ListRemove onClick={() => set({ toc: v.toc.filter((_, j) => j !== i) })} />
                  </div>
                ))}
                {v.toc.length < LIMITS.toc && (
                  <Btn kind="ghost" onClick={() => set({ toc: [...v.toc, { theme: '', takeaway: '' }] })}>
                    <Icon name="plus" size={15} stroke={2.4} /> Add a theme
                  </Btn>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <span className="flex flex-wrap items-baseline gap-3">
                  <span className="text-[17px] font-semibold text-text">Follow-ups</span>
                  <span className="text-[12.5px] text-dim">
                    {v.followups.length} prepared · {v.tier === 'core' ? 5 : 3}+ needed
                  </span>
                </span>
                {FOLLOWUP_SET.map((q) => {
                  const cur = v.followups.find((f) => f.q === q);
                  return (
                    <details key={q} className="bh-details bh-fu" open={!!cur}>
                      <summary className="font-mono" data-done={cur ? '1' : undefined}>
                        {q}
                      </summary>
                      <div className="pt-2">
                        <Area
                          value={cur?.a ?? ''}
                          rows={2}
                          max={MAX_ITEM}
                          placeholder="Short and direct: a leaf question wants one or two sentences."
                          onChange={(a) => set({ followups: a.trim() ? [...v.followups.filter((f) => f.q !== q), { q, a }] : v.followups.filter((f) => f.q !== q) })}
                        />
                      </div>
                    </details>
                  );
                })}
              </div>

              {v.signals.length > 0 && (
                <div className="flex flex-col gap-3">
                  <span className="flex flex-wrap items-baseline gap-3">
                    <span className="text-[17px] font-semibold text-text">Re-cuts</span>
                    <ConceptLink concept="recut" go={go}>
                      What is a re-cut? →
                    </ConceptLink>
                  </span>
                  {v.signals.map((k) => (
                    <Field key={k} label={`Asked about ${signalByKey(k).title}`} hint="What to put up front.">
                      <Input value={v.recuts[k] ?? ''} onChange={(x) => set({ recuts: { ...v.recuts, [k]: x } })} max={MAX_SHORT} placeholder="Lead with…" />
                    </Field>
                  ))}
                </div>
              )}
            </>
          )}

          {stage === 'defend' && (
            <>
              <p className="m-0 text-[14.5px] leading-[1.55] text-soft">
                Interviewers have 45 minutes and fill gaps with assumptions. Below is what the Doctor flags; then run the self-check for each signal area this story claims.
              </p>
              {v.signals.map((k) => (
                <div key={k} className="flex flex-col gap-2">
                  <Eyebrow>Self-check: {signalByKey(k).title}</Eyebrow>
                  <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-[14.5px] text-soft">
                    {signalByKey(k).pitfalls.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </>
          )}
        </div>

        <aside className="bh-doc-wrap flex flex-col gap-3" aria-label="Story Doctor">
          <Eyebrow>Story Doctor · {cur.title.slice(4)}</Eyebrow>
          <Doctor findings={here} go={go} onDefend={defend} empty={stage === 'defend' ? 'No defensive red flags found.' : 'This part holds up.'} />
          {stage !== 'defend' && <DoctorSummary findings={findings} current={cur.sections} onJump={(s) => setStage(s)} />}
        </aside>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-white/8 pt-5">
        <Btn onClick={() => onSave(v)} disabled={busy || !v.title.trim() || !dirty}>
          {busy ? 'Saving…' : 'Save story'}
        </Btn>
        {stage !== 'defend' && (
          <button type="button" className="iv-link" onClick={() => setStage(EDIT_STAGES[EDIT_STAGES.findIndex((s) => s.key === stage) + 1].key)}>
            Next stage →
          </button>
        )}
        <button type="button" className="iv-link" onClick={onClose}>
          {dirty ? 'Discard changes' : 'Back to catalog'}
        </button>
        {onDelete && (
          <button type="button" className="iv-link ml-auto" onClick={onDelete}>
            Delete
          </button>
        )}
      </div>
    </section>
  );
}

function DoctorSummary({ findings, current, onJump }: { findings: Finding[]; current: Section[]; onJump: (s: EditStage) => void }) {
  const elsewhere = EDIT_STAGES.filter((s) => !s.sections.some((x) => current.includes(x)))
    .map((s) => ({ s, n: findings.filter((f) => s.sections.includes(f.section) && !f.ack && f.severity !== 'tip').length }))
    .filter((x) => x.n > 0);
  if (!elsewhere.length) return null;
  return (
    <p className="m-0 text-[13px] text-dim">
      Also open:{' '}
      {elsewhere.map((x, i) => (
        <span key={x.s.key}>
          {i > 0 && ', '}
          <button type="button" className="iv-link" onClick={() => onJump(x.s.key)}>
            {x.s.title.slice(4)} ({x.n})
          </button>
        </span>
      ))}
    </p>
  );
}
