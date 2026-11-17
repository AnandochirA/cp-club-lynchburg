'use client';

import { useState } from 'react';
import { apiErrors } from '@/lib/content';
import { apiDelete, apiPost } from '@/lib/client-api';
import { FOLLOWUP_KINDS, type FollowupKind } from '@/lib/bh/kit';
import { type Debrief, type DebriefInput, type DebriefQuestion, debriefActions } from '@/lib/bh/model';
import { SIGNALS, type SignalKey, signalByKey } from '@/lib/bh/signals';
import type { Story } from '@/lib/bh/story';
import { Icon } from '../icons';
import type { Shared } from './BehavioralStudio';
import { Area, Btn, ConceptLink, Eyebrow, Field, Grade, H2, Input, bhErrors } from './ui';

const blankQ = (): DebriefQuestion => ({ text: '', signal: '', storyId: null, followups: [], felt: 'ok', missing: '' });
const blank = (): DebriefInput => ({
  company: '',
  roundKind: '',
  when: new Date().toISOString().slice(0, 10),
  questions: [blankQ()],
  engagement: 'neutral',
  storiesTold: 0,
  rushed: false,
  early: false,
  notes: '',
});

/**
 * After a real interview: capture it while it is fresh, read what the
 * follow-ups meant, and turn it into fixes on specific stories.
 */
export function Debriefs({ state, go, setStories, refresh }: Shared) {
  const [draft, setDraft] = useState<DebriefInput | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filed, setFiled] = useState<string[] | null>(null);
  const { stories, debriefs } = state;

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    const clean = { ...draft, questions: draft.questions.filter((q) => q.text.trim()) };
    const res = await apiPost<{ debrief: Debrief; touched: Story[] }>('/api/behavioral/debriefs', clean);
    setBusy(false);
    if (!res.ok) return setError(bhErrors[res.error] ?? apiErrors[res.error] ?? apiErrors.server);
    setStories((all) => all.map((s) => res.data.touched.find((t) => t.id === s.id) ?? s));
    setFiled(debriefActions(clean, stories).map((a) => (a.storyId ? `${stories.find((s) => s.id === a.storyId)?.title}: ${a.text}` : a.text)));
    setDraft(null);
    void refresh();
  }

  async function remove(id: number) {
    if (!window.confirm('Delete this debrief? To-dos it filed on stories stay.')) return;
    const res = await apiDelete(`/api/behavioral/debriefs/${id}`);
    if (res.ok) void refresh();
  }

  const setQ = (i: number, patch: Partial<DebriefQuestion>) => draft && setDraft({ ...draft, questions: draft.questions.map((q, j) => (j === i ? { ...q, ...patch } : q)) });

  return (
    <>
      <section className="panel bh-hero flex flex-col gap-3 p-5 lg:p-8" aria-labelledby="db-title">
        <span className="eyebrow-m">After the interview</span>
        <h1 id="db-title" className="bh-title font-display caps m-0" style={{ fontSize: 'clamp(54px, 9vw, 104px)' }}>
          Debriefs
        </h1>
        <p className="m-0 max-w-[64ch] text-[15.5px] leading-[1.55] text-soft">
          Within 30 minutes of an interview, write down every question, the story you used, and how the follow-ups went. Your memory fades within hours. Each debrief files fixes on the stories involved.
        </p>
        {!draft && (
          <Btn
            onClick={() => {
              setDraft(blank());
              setFiled(null);
            }}
          >
            <Icon name="plus" size={15} stroke={2.4} /> New debrief
          </Btn>
        )}
      </section>

      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}

      {filed && (
        <section className="panel flex flex-col gap-3 p-5 lg:p-7" aria-label="What got filed">
          <Eyebrow>Saved. Here is what it turned into</Eyebrow>
          {filed.length ? (
            <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-[14.5px] text-soft">
              {filed.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-[14.5px] text-muted">Nothing to fix. Sounds like it went well.</p>
          )}
          <button type="button" className="iv-link w-fit" onClick={() => go({ tab: 'catalog' })}>
            Open the catalog →
          </button>
        </section>
      )}

      {draft && (
        <section className="panel flex flex-col gap-5 p-5 lg:p-8" aria-labelledby="dbn-title">
          <H2 id="dbn-title">New debrief</H2>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-3">
            <Field label="Company">
              <Input value={draft.company} onChange={(company) => setDraft({ ...draft, company })} max={80} />
            </Field>
            <Field label="Round">
              <Input value={draft.roundKind} onChange={(roundKind) => setDraft({ ...draft, roundKind })} max={60} placeholder="Hiring manager behavioral" />
            </Field>
            <Field label="Date">
              <Input type="date" value={draft.when} onChange={(when) => setDraft({ ...draft, when })} />
            </Field>
          </div>

          <div className="flex flex-col gap-4">
            <span className="flex flex-wrap items-baseline gap-3">
              <span className="text-[17px] font-semibold text-text">Every question they asked</span>
              <ConceptLink concept="debrief" go={go}>
                Reading the follow-ups →
              </ConceptLink>
            </span>
            {draft.questions.map((q, i) => (
              <div key={i} className="bh-dq flex flex-col gap-3">
                <div className="flex gap-3">
                  <Input value={q.text} onChange={(text) => setQ(i, { text })} max={300} placeholder={`Question ${i + 1}`} />
                  {draft.questions.length > 1 && (
                    <button type="button" className="iv-link shrink-0" onClick={() => setDraft({ ...draft, questions: draft.questions.filter((_, j) => j !== i) })}>
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <Eyebrow>What it was scoring</Eyebrow>
                    <select className="iv-input" value={q.signal} onChange={(e) => setQ(i, { signal: e.target.value as SignalKey | '' })}>
                      <option value="">Not sure</option>
                      {SIGNALS.map((a) => (
                        <option key={a.key} value={a.key}>
                          {a.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <Eyebrow>Story you used</Eyebrow>
                    <select className="iv-input" value={q.storyId ?? ''} onChange={(e) => setQ(i, { storyId: e.target.value ? Number(e.target.value) : null })}>
                      <option value="">None of mine fit</option>
                      {stories.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Eyebrow>Follow-ups you got</Eyebrow>
                  <div className="flex flex-wrap gap-2">
                    {FOLLOWUP_KINDS.map((k) => {
                      const on = q.followups.includes(k.key);
                      return (
                        <label key={k.key} className="iv-chip bh-tag" title={k.meaning}>
                          <input type="checkbox" checked={on} onChange={() => setQ(i, { followups: on ? q.followups.filter((x) => x !== k.key) : [...q.followups, k.key as FollowupKind] })} />
                          <span>{k.title}</span>
                        </label>
                      );
                    })}
                  </div>
                  {q.followups.map((f) => {
                    const k = FOLLOWUP_KINDS.find((x) => x.key === f)!;
                    return (
                      <span key={f} className="text-[13px] text-muted">
                        <Grade grade={k.tone}>{k.title}</Grade> {k.meaning}
                      </span>
                    );
                  })}
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-[auto_1fr] md:items-end">
                  <div className="flex flex-col gap-1.5">
                    <Eyebrow>How it felt</Eyebrow>
                    <div className="flex gap-2">
                      {(['good', 'ok', 'bad'] as const).map((f) => (
                        <label key={f} className="iv-chip bh-tag">
                          <input type="radio" name={`felt-${i}`} checked={q.felt === f} onChange={() => setQ(i, { felt: f })} />
                          <span>{f === 'good' ? 'Strong' : f === 'ok' ? 'Okay' : 'Weak'}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {q.storyId && (
                    <Field label="A fact they asked for that you didn't have" hint="It gets added as a to-do on the story.">
                      <Input value={q.missing} onChange={(missing) => setQ(i, { missing })} max={200} placeholder="How many users it reached" />
                    </Field>
                  )}
                </div>
              </div>
            ))}
            {draft.questions.length < 15 && (
              <Btn kind="ghost" onClick={() => setDraft({ ...draft, questions: [...draft.questions, blankQ()] })}>
                <Icon name="plus" size={15} stroke={2.4} /> Another question
              </Btn>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-[17px] font-semibold text-text">Pacing and the room</span>
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-3">
              <label className="flex flex-col gap-1.5">
                <Eyebrow>How engaged were they?</Eyebrow>
                <select className="iv-input" value={draft.engagement} onChange={(e) => setDraft({ ...draft, engagement: e.target.value as DebriefInput['engagement'] })}>
                  <option value="high">Taking notes, nodding, digging in</option>
                  <option value="neutral">Professional, hard to read</option>
                  <option value="low">Checking the time, cutting me off</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <Eyebrow>Stories told in total</Eyebrow>
                <input className="iv-input" type="number" min={0} max={30} value={draft.storiesTold || ''} onChange={(e) => setDraft({ ...draft, storiesTold: Math.max(0, Number(e.target.value) || 0) })} />
              </label>
              <div className="flex flex-col gap-2">
                <label className="iv-chip bh-tag w-fit">
                  <input type="checkbox" checked={draft.rushed} onChange={() => setDraft({ ...draft, rushed: !draft.rushed })} />
                  <span>They rushed or skipped questions at the end</span>
                </label>
                <label className="iv-chip bh-tag w-fit">
                  <input type="checkbox" checked={draft.early} onChange={() => setDraft({ ...draft, early: !draft.early })} />
                  <span>We finished 10+ minutes early</span>
                </label>
              </div>
            </div>
            <Field label="Anything else">
              <Area value={draft.notes} onChange={(notes) => setDraft({ ...draft, notes })} rows={3} max={2000} placeholder="Moments you felt strong or shaky, topics you wish you had covered…" />
            </Field>
          </div>

          <div className="flex flex-wrap gap-3">
            <Btn onClick={() => void save()} disabled={busy || (!draft.company.trim() && !draft.questions.some((q) => q.text.trim()))}>
              {busy ? 'Saving…' : 'Save and file fixes'}
            </Btn>
            <button type="button" className="iv-link" onClick={() => setDraft(null)}>
              Cancel
            </button>
          </div>
        </section>
      )}

      <section className="panel flex flex-col gap-3 p-5 lg:p-7" aria-label="Past debriefs">
        <H2>Past debriefs</H2>
        {debriefs.length === 0 ? (
          <p className="m-0 text-[14.5px] text-muted">None yet. File one after your next real interview, even a recruiter screen.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {debriefs.map((d) => {
              const bad = d.questions.filter((q) => q.followups.includes('skeptical') || q.followups.includes('redirecting')).length;
              return (
                <li key={d.id} className="bh-story">
                  <span className="flex items-start justify-between gap-3">
                    <span className="flex flex-col gap-1">
                      <span className="text-[17px] font-semibold text-text">{d.company || 'Interview'}</span>
                      <span className="font-mono text-[12px] text-dim">
                        {d.when} {d.roundKind && `· ${d.roundKind}`} · {d.questions.length} question{d.questions.length === 1 ? '' : 's'}
                      </span>
                    </span>
                    <button type="button" className="iv-link" onClick={() => void remove(d.id)}>
                      Delete
                    </button>
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    {[...new Set(d.questions.map((q) => q.signal).filter(Boolean))].map((k) => (
                      <span key={k} className="mode-tag font-mono">
                        {signalByKey(k as SignalKey).title}
                      </span>
                    ))}
                  </span>
                  {bad > 0 && <span className="text-[13.5px] text-[var(--color-gold)]">{bad} answer{bad === 1 ? '' : 's'} drew skeptical or redirecting follow-ups.</span>}
                  {d.notes && <span className="text-[14px] text-muted">{d.notes}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
