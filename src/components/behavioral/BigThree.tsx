'use client';

import { useEffect, useState } from 'react';
import { askLint, tmayLint } from '@/lib/bh/answer';
import { favoriteRanking } from '@/lib/bh/catalog';
import { STAGES, stageRank } from '@/lib/bh/coach';
import { ASK_ROLES, type AskRole } from '@/lib/bh/kit';
import { type Profile, tmayText } from '@/lib/bh/model';
import { cardByKey } from '@/lib/bh/playbook';
import { questionById } from '@/lib/bh/questions';
import { hasNumber, speakSeconds, wordCount } from '@/lib/bh/text';
import { Icon } from '../icons';
import type { Shared } from './BehavioralStudio';
import { Round } from './Round';
import { Area, Arrow, Btn, ConceptLink, Eyebrow, Field, Grade, H2, Input, SignalTags, mmss } from './ui';

const CONFLICT_IDS = ['res-relationship', 'def-blame', 'def-leaden', 'def-misconduct', 'ctx-stakes', 'act-people'];

/**
 * The Big Three: Tell me about yourself, your favorite project, and a
 * conflict, the questions asked in nearly every loop and so the only ones
 * worth polishing in advance, plus the questions you will ask them.
 */
export function BigThree({ state, path, go, saveProfile, setFocus, now, refresh, onBack }: Shared & { onBack: () => void }) {
  const { profile, stories } = state;
  const [draft, setDraft] = useState<Profile>(profile);
  const [saving, setSaving] = useState(false);
  const [rehearse, setRehearse] = useState<'tmay' | 'project' | 'conflict' | null>(null);
  const [n, setN] = useState(0);
  useEffect(() => setDraft(profile), [profile]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(profile);
  const save = async () => {
    setSaving(true);
    await saveProfile(draft);
    setSaving(false);
  };

  if (rehearse) {
    const qid = rehearse === 'tmay' ? 'tmay' : rehearse === 'project' ? 'proj-favorite' : 'conf-resolved';
    const story = rehearse === 'project' ? stories.find((s) => s.id === profile.big3.favoriteId) : rehearse === 'conflict' ? stories.find((s) => s.id === profile.big3.conflictId) : undefined;
    return (
      <Round
        key={`${qid}-${n}`}
        question={questionById(qid)!}
        stories={stories}
        profile={profile}
        kind={rehearse === 'tmay' ? 'tmay' : 'rehearse'}
        story={story}
        label={rehearse === 'tmay' ? 'Tell me about yourself' : 'Big Three rehearsal'}
        nextLabel="Another take"
        now={now}
        go={go}
        onSaved={() => void refresh()}
        onNext={() => setN(n + 1)}
        onExit={() => {
          setFocus(false);
          setRehearse(null);
        }}
      />
    );
  }

  const t = draft.tmay;
  const tText = tmayText(t);
  const tSecs = speakSeconds(wordCount(tText));
  const lint = tmayLint(tText);
  const tChecks: { ok: boolean; label: string }[] = [
    { ok: !!t.summary, label: 'A one- or two-line summary: role, focus, what sets you apart' },
    { ok: t.wins.filter((w) => w.trim()).length >= 2, label: '2–3 accomplishments, one line each' },
    { ok: t.wins.some(hasNumber), label: 'At least one accomplishment has a number' },
    { ok: !!t.forward, label: 'A forward-looking close that hands the conversation back' },
    { ok: !lint.origin, label: 'No childhood origin story' },
    { ok: !lint.history, label: 'No job-by-job history lesson' },
    { ok: !lint.negative, label: lint.negative ? `Negativity: “${lint.negative}”` : 'Nothing negative about past employers' },
    { ok: tSecs <= 150, label: `About 2 minutes out loud (now ~${mmss(tSecs)})` },
  ];
  const fav = favoriteRanking(stories);
  const conflictStories = stories.filter((s) => s.signals.includes('conflict'));
  const con = stories.find((s) => s.id === draft.big3.conflictId);
  const conFindings = con ? (path.statuses.get(con.id)?.findings ?? []).filter((f) => CONFLICT_IDS.includes(f.id) && !f.ack) : [];
  const setTmay = (patch: Partial<Profile['tmay']>) => setDraft({ ...draft, tmay: { ...draft.tmay, ...patch } });

  return (
    <>
      <section className="panel flex flex-col gap-3 p-5 lg:p-8" aria-labelledby="b3-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <Eyebrow>Asked in nearly every loop</Eyebrow>
            <H2 id="b3-title">The Big Three</H2>
          </div>
          <button type="button" className="iv-link" onClick={onBack}>
            Back
          </button>
        </div>
        <p className="m-0 max-w-[66ch] text-[14.5px] leading-[1.55] text-soft">
          You cannot predict most questions, but you can predict these three. Polish them until you can say them without notes.
        </p>
      </section>

      {/* ------------------------------------------------------------ TMAY */}
      <section className="panel flex flex-col gap-5 p-5 lg:p-8" aria-labelledby="tmay-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <H2 id="tmay-title">1 · Tell me about yourself</H2>
          <ConceptLink concept="tmay" go={go}>
            {cardByKey('tmay').title} →
          </ConceptLink>
        </div>
        <div className="bh-edit">
          <div className="flex min-w-0 flex-col gap-4">
            <Field label="Personal summary" hint="Role, experience, the focus that sets you apart. Tailored to this job.">
              <Area value={t.summary} onChange={(summary) => setTmay({ summary })} rows={2} max={500} placeholder="I'm a CS senior focused on backend systems, with two internships behind me…" />
            </Field>
            {[0, 1, 2].map((i) => (
              <Field key={i} label={`Accomplishment ${i + 1}${i === 2 ? ' (optional)' : ''}`} hint={i === 0 ? 'One line: a bit of technical detail plus the impact. Tease your favorite project.' : undefined}>
                <Input
                  value={t.wins[i] ?? ''}
                  max={300}
                  onChange={(v) => {
                    const wins = [...t.wins];
                    wins[i] = v;
                    setTmay({ wins: wins.map((w) => w ?? '').slice(0, 3) });
                  }}
                  placeholder={i === 0 ? 'At Acme I cut the report query from 40s to 2s, which…' : ''}
                />
              </Field>
            ))}
            <Field label="Breadth list (optional)" hint="The halo effect: a quick list of other things you have done.">
              <Input value={t.halo} onChange={(halo) => setTmay({ halo })} max={300} placeholder="I've also built a CI pipeline, two hackathon apps, and tutored intro CS." />
            </Field>
            <Field label="Gap, layoff or short stint (only if your resume raises it)">
              <Input value={t.gap} onChange={(gap) => setTmay({ gap })} max={300} />
            </Field>
            <Field label="Forward-looking close" hint="Connect your past to this role, then hand the conversation back.">
              <Input value={t.forward} onChange={(forward) => setTmay({ forward })} max={300} placeholder="I'm excited to bring that to a team working at real scale…" />
            </Field>
          </div>
          <aside className="flex flex-col gap-2" aria-label="TMAY checks">
            <Eyebrow>Checks</Eyebrow>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {tChecks.map((c) => (
                <li key={c.label} className="flex items-start gap-2 text-[14px]">
                  <Grade grade={c.ok ? 'good' : 'bad'}>{c.ok ? 'ok' : 'fix'}</Grade>
                  <span className={c.ok ? 'text-muted' : 'text-soft'}>{c.label}</span>
                </li>
              ))}
            </ul>
            <span className="font-mono text-[12px] text-dim">{state.stats.tmayGood} good spoken takes</span>
          </aside>
        </div>
        <div className="flex flex-wrap gap-3">
          {dirty && (
            <Btn onClick={() => void save()} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Btn>
          )}
          <Btn
            kind={dirty ? 'ghost' : 'primary'}
            disabled={dirty}
            onClick={() => {
              setFocus(true);
              setRehearse('tmay');
            }}
          >
            Rehearse it out loud <Arrow />
          </Btn>
        </div>
      </section>

      {/* ------------------------------------------------------------ project */}
      <section className="panel flex flex-col gap-4 p-5 lg:p-8" aria-labelledby="proj-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <H2 id="proj-title">2 · Your favorite project</H2>
          <ConceptLink concept="project" go={go}>
            {cardByKey('project').title} →
          </ConceptLink>
        </div>
        <p className="m-0 text-[14.5px] leading-[1.55] text-soft">
          However it is asked (favorite, most impactful, proudest), answer with the same story: the one where impact, scope and <b>your</b> contribution overlap most. Ranked from the scale you entered on each story:
        </p>
        {fav.length === 0 ? (
          <Btn onClick={() => go({ tab: 'catalog', mode: 'mine' })}>Mine your core stories first</Btn>
        ) : (
          <ul className="bh-pick m-0 list-none p-0">
            {fav.slice(0, 5).map((f, i) => {
              const st = path.statuses.get(f.story.id)!;
              const on = draft.big3.favoriteId === f.story.id;
              return (
                <li key={f.story.id}>
                  <button type="button" className="bh-pick-btn" data-on={on ? '1' : undefined} onClick={() => setDraft({ ...draft, big3: { ...draft.big3, favoriteId: f.story.id } })}>
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-[15.5px] font-semibold text-text">
                        {on ? '● ' : ''}
                        {f.story.title}
                        {i === 0 && <span className="font-mono text-[11px] text-[var(--tier)]"> · top ranked</span>}
                      </span>
                      <span className="bh-stage font-mono" data-stage={st.stage}>
                        {STAGES.find((x) => x.key === st.stage)?.title}
                      </span>
                    </span>
                    <span className="font-mono text-[12px] text-dim">
                      impact {f.story.scale.impact || '?'} × contribution {f.story.scale.contribution || '?'} × scope → {f.score}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {profile.big3.favoriteId && (
          <div className="flex flex-wrap gap-3">
            <Btn
              onClick={() => {
                setFocus(true);
                setRehearse('project');
              }}
            >
              Rehearse it <Arrow />
            </Btn>
            <Btn kind="ghost" onClick={() => go({ tab: 'catalog', storyId: profile.big3.favoriteId! })}>
              Open the story
            </Btn>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------ conflict */}
      <section className="panel flex flex-col gap-4 p-5 lg:p-8" aria-labelledby="conf-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <H2 id="conf-title">3 · A conflict you resolved</H2>
          <ConceptLink concept="conflict" go={go}>
            {cardByKey('conflict').title} →
          </ConceptLink>
        </div>
        <p className="m-0 text-[14.5px] leading-[1.55] text-soft">
          Behind more no-hires and down-levels than almost any other question. Pick one with high stakes, where you were central, and where you were at least partly right.
        </p>
        {conflictStories.length === 0 ? (
          <Btn onClick={() => go({ tab: 'catalog', mode: 'mine', signal: 'conflict' })}>Mine a conflict story</Btn>
        ) : (
          <div className="flex flex-wrap gap-2">
            {conflictStories.map((s) => (
              <button key={s.id} type="button" className="iv-chip-btn" data-on={draft.big3.conflictId === s.id ? '1' : undefined} onClick={() => setDraft({ ...draft, big3: { ...draft.big3, conflictId: s.id } })}>
                {s.title}
              </button>
            ))}
          </div>
        )}
        {con && (
          <div className="flex flex-col gap-3">
            <SignalTags keys={con.signals} />
            <label className="iv-chip bh-tag w-fit">
              <input type="checkbox" checked={draft.big3.conflictCentral} onChange={() => setDraft({ ...draft, big3: { ...draft.big3, conflictCentral: !draft.big3.conflictCentral } })} />
              <span>I was central to resolving it (not a bystander)</span>
            </label>
            <label className="iv-chip bh-tag w-fit">
              <input type="checkbox" checked={draft.big3.conflictRight} onChange={() => setDraft({ ...draft, big3: { ...draft.big3, conflictRight: !draft.big3.conflictRight } })} />
              <span>My position was at least partly right</span>
            </label>
            {stageRank(path.statuses.get(con.id)!.stage) < stageRank('detailed') && <p className="m-0 text-[14px] text-[var(--color-gold)]">Detail this story first: it still has blockers.</p>}
            {conFindings.length > 0 ? (
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {conFindings.map((f) => (
                  <li key={f.id} className="text-[14px] text-soft">
                    <Grade grade={f.severity === 'tip' ? 'ok' : 'bad'}>{f.title}</Grade> {f.fix}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 text-[14px] text-muted">✓ Tension, relationship and framing all look right.</p>
            )}
            <details className="bh-details">
              <summary className="font-mono">Beats that land (does your story have them?)</summary>
              <ul className="m-0 flex list-disc flex-col gap-1 pt-2 pl-5 text-[14px] text-soft">
                {cardByKey('conflict').points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </details>
            <div className="flex flex-wrap gap-3">
              {profile.big3.conflictId === con.id && !dirty && (
                <Btn
                  onClick={() => {
                    setFocus(true);
                    setRehearse('conflict');
                  }}
                >
                  Rehearse it <Arrow />
                </Btn>
              )}
              <Btn kind="ghost" onClick={() => go({ tab: 'catalog', storyId: con.id })}>
                Open the story
              </Btn>
            </div>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------ asks */}
      <section className="panel flex flex-col gap-4 p-5 lg:p-8" aria-labelledby="ask-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <H2 id="ask-title">Your questions for them</H2>
          <ConceptLink concept="asks" go={go}>
            {cardByKey('asks').title} →
          </ConceptLink>
        </div>
        <p className="m-0 text-[14.5px] leading-[1.55] text-soft">You only get time for one or two, and they judge you on them. Tailor them to who is across the table.</p>
        {draft.asks.map((a, i) => {
          const l = askLint(a.text);
          return (
            <div key={i} className="flex flex-col gap-2">
              <div className="grid grid-cols-[minmax(0,1fr)] gap-2 md:grid-cols-[180px_1fr_auto] md:items-center">
                <select className="iv-input" value={a.role} onChange={(e) => setDraft({ ...draft, asks: draft.asks.map((x, j) => (j === i ? { ...x, role: e.target.value as AskRole } : x)) })}>
                  {ASK_ROLES.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.title}
                    </option>
                  ))}
                </select>
                <Input value={a.text} max={300} onChange={(text) => setDraft({ ...draft, asks: draft.asks.map((x, j) => (j === i ? { ...x, text } : x)) })} />
                <button type="button" className="iv-link" onClick={() => setDraft({ ...draft, asks: draft.asks.filter((_, j) => j !== i) })}>
                  Remove
                </button>
              </div>
              {(l.bland || l.red) && (
                <span className="text-[13px] text-[var(--color-gold)]">{l.red ? `Red flag (“${l.red}”): save it for the offer stage.` : `Bland (“${l.bland}”): make it specific to them, and ask for a real example.`}</span>
              )}
            </div>
          );
        })}
        <div className="bh-cards">
          {ASK_ROLES.map((r) => (
            <div key={r.key} className="bh-card">
              <b className="text-[15px] text-text">{r.title}</b>
              <span className="text-[13px] text-muted">{r.focus}</span>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {r.examples.map((e) => (
                  <li key={e}>
                    <button type="button" className="bh-prompt" disabled={draft.asks.length >= 15} onClick={() => setDraft({ ...draft, asks: [...draft.asks, { role: r.key, text: e }] })}>
                      <Icon name="plus" size={12} stroke={2.6} /> {e}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <Btn kind="ghost" onClick={() => setDraft({ ...draft, asks: [...draft.asks, { role: 'manager', text: '' }] })}>
            <Icon name="plus" size={15} stroke={2.4} /> Write my own
          </Btn>
          {dirty && (
            <Btn onClick={() => void save()} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Btn>
          )}
        </div>
      </section>
    </>
  );
}
