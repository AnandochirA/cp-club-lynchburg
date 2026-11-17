'use client';

import { useEffect, useState } from 'react';
import { apiErrors } from '@/lib/content';
import { apiDelete, apiPost } from '@/lib/client-api';
import { STAGES, open as openFindings } from '@/lib/bh/coach';
import { SIGNALS, type SignalKey, signalByKey } from '@/lib/bh/signals';
import { MAX_STORIES, SOURCES, type Story, type StoryInput, emptyStory } from '@/lib/bh/story';
import { Icon } from '../icons';
import type { Shared } from './BehavioralStudio';
import { Mine } from './Mine';
import { type EditStage, StoryEditor } from './StoryEditor';
import { Btn, Eyebrow, H2, SignalTags, bhErrors } from './ui';

type View = { kind: 'list'; signal?: SignalKey } | { kind: 'mine'; signal?: SignalKey } | { kind: 'edit'; id: number | null; draft: StoryInput; stage: EditStage; v: number };

const toInput = (s: Story): StoryInput => {
  const { id: _id, updatedAt: _u, ...rest } = s;
  return rest;
};

/** The story catalog: every story, its stage and Doctor score, coverage by signal area, mining and editing. */
export function Catalog({ state, path, go, nav, setStories }: Shared) {
  const { stories, profile, stats } = state;
  const [view, setView] = useState<View>({ kind: 'list' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => new Date());

  // Arriving from another tab: open mining, a story, or a filtered list.
  useEffect(() => {
    if (!nav.key) return;
    if (nav.mode === 'mine') setView({ kind: 'mine', signal: nav.signal });
    else if (nav.storyId) {
      const s = stories.find((x) => x.id === nav.storyId);
      if (s) setView({ kind: 'edit', id: s.id, draft: toInput(s), stage: firstOpenStage(s.id), v: Date.now() });
    } else setView({ kind: 'list', signal: nav.signal });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav.key]);

  function firstOpenStage(id: number): EditStage {
    const f = openFindings(path.statuses.get(id)?.findings ?? []).filter((x) => x.severity !== 'tip');
    if (f.some((x) => x.section === 'seed')) return 'seed';
    if (f.some((x) => ['context', 'actions', 'results', 'learnings'].includes(x.section))) return 'detail';
    if (f.some((x) => x.section === 'scaffold')) return 'scaffold';
    if (f.some((x) => x.section === 'defense')) return 'defend';
    return 'detail';
  }

  async function save(input: StoryInput, id: number | null, then: 'stay' | 'list' | 'edit' | 'mine') {
    setBusy(true);
    setError(null);
    const res = await apiPost<{ story: Story }>('/api/behavioral/stories', { ...input, id: id ?? undefined });
    setBusy(false);
    if (!res.ok) {
      setError(bhErrors[res.error] ?? apiErrors[res.error] ?? apiErrors.server);
      return;
    }
    const s = res.data.story;
    setStories((all) => [s, ...all.filter((x) => x.id !== s.id)]);
    if (then === 'list') setView({ kind: 'list' });
    else if (then === 'edit' || then === 'stay') setView({ kind: 'edit', id: s.id, draft: toInput(s), stage: view.kind === 'edit' ? view.stage : 'detail', v: Date.now() });
  }

  async function remove(id: number) {
    if (!window.confirm('Delete this story? Rounds that used it keep their transcripts.')) return;
    const res = await apiDelete(`/api/behavioral/stories/${id}`);
    if (!res.ok) return setError(apiErrors[res.error] ?? apiErrors.server);
    setStories((all) => all.filter((x) => x.id !== id));
    setView({ kind: 'list' });
  }

  const err = error && (
    <p role="alert" className="notice">
      {error}
    </p>
  );

  if (view.kind === 'mine')
    return (
      <>
        {err}
        <Mine
          level={profile.level}
          focus={view.signal}
          busy={busy}
          onSeed={(s, openAfter) => void save(s, null, openAfter ? 'edit' : 'mine')}
          onClose={() => setView({ kind: 'list' })}
        />
        <SeedList stories={stories} />
      </>
    );

  if (view.kind === 'edit')
    return (
      <>
        {err}
        <StoryEditor
          key={view.v}
          id={view.id}
          initial={view.draft}
          profile={profile}
          goodTakes={view.id ? (stats.goodTakes[view.id] ?? 0) : 0}
          now={now}
          go={go}
          busy={busy}
          startStage={view.stage}
          onSave={(s) => void save(s, view.id, 'stay')}
          onDelete={view.id ? () => void remove(view.id!) : null}
          onClose={() => setView({ kind: 'list' })}
        />
      </>
    );

  const shown = view.signal ? stories.filter((s) => s.signals.includes(view.signal!)) : stories;
  const cov = path.coverage;

  return (
    <>
      {err}
      <section className="panel flex flex-col gap-5 p-5 lg:p-7" aria-labelledby="cat-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <Eyebrow>
              {stories.length}/{MAX_STORIES} stories · {stories.filter((s) => s.tier === 'core').length} core
            </Eyebrow>
            <H2 id="cat-title">Story catalog</H2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Btn onClick={() => setView({ kind: 'mine' })}>Mine stories</Btn>
            <Btn kind="ghost" disabled={stories.length >= MAX_STORIES} onClick={() => setView({ kind: 'edit', id: null, draft: emptyStory(view.signal ? [view.signal] : []), stage: 'seed', v: Date.now() })}>
              <Icon name="plus" size={15} stroke={2.4} /> New story
            </Btn>
          </div>
        </div>

        <div className="bh-matrix" role="table" aria-label="Which stories cover which signal areas">
          {SIGNALS.map((a) => {
            const c = cov.by[a.key];
            const ids = [...c.core, ...c.supporting];
            return (
              <div key={a.key} role="row" className="bh-matrix-row" data-gap={ids.length === 0 ? '1' : undefined}>
                <button type="button" role="rowheader" className="bh-matrix-head font-mono" aria-pressed={view.signal === a.key} onClick={() => setView({ kind: 'list', signal: view.signal === a.key ? undefined : a.key })}>
                  {a.title}
                </button>
                <span role="cell" className="flex min-w-0 flex-wrap gap-1.5">
                  {ids.length === 0 ? (
                    <button type="button" className="iv-link" onClick={() => setView({ kind: 'mine', signal: a.key })}>
                      No story yet. Mine one →
                    </button>
                  ) : (
                    ids.map((id) => {
                      const s = stories.find((x) => x.id === id)!;
                      return (
                        <button key={id} type="button" className="bh-matrix-chip" data-core={s.tier === 'core' ? '1' : undefined} onClick={() => setView({ kind: 'edit', id, draft: toInput(s), stage: firstOpenStage(id), v: Date.now() })}>
                          {s.title}
                        </button>
                      );
                    })
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {view.signal && (
        <p className="m-0 text-[14px] text-muted">
          Showing stories for <b className="text-soft">{signalByKey(view.signal).title}</b> ·{' '}
          <button type="button" className="iv-link" onClick={() => setView({ kind: 'list' })}>
            show all
          </button>
        </p>
      )}

      {shown.length === 0 ? (
        <p className="panel m-0 p-5 text-[15px] leading-[1.55] text-muted lg:p-7">
          No stories yet. Start with Mine stories: brainstorm a handful of seeds, then detail the two or three biggest.
        </p>
      ) : (
        <ul className="bh-stories m-0 list-none p-0">
          {shown.map((s) => {
            const st = path.statuses.get(s.id)!;
            const top = openFindings(st.findings).sort((a, b) => sevRank(a.severity) - sevRank(b.severity))[0];
            const todos = s.todos.filter((t) => !t.done).length;
            return (
              <li key={s.id}>
                <button type="button" className="bh-story" data-core={s.tier === 'core' ? '1' : undefined} onClick={() => setView({ kind: 'edit', id: s.id, draft: toInput(s), stage: firstOpenStage(s.id), v: Date.now() })}>
                  <span className="flex items-start justify-between gap-3">
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="text-[18px] leading-[1.25] font-semibold text-text">
                        {s.tier === 'core' && <span className="text-[var(--tier)]">★ </span>}
                        {s.title}
                      </span>
                      <span className="font-mono text-[11.5px] text-dim">
                        {SOURCES.find((x) => x.key === s.source)?.title}
                        {s.when && ` · ${s.when}`}
                        {s.setting && ` · ${s.setting}`}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="bh-stage font-mono" data-stage={st.stage}>
                        {STAGES.find((x) => x.key === st.stage)?.title}
                      </span>
                      <span className="bh-score font-display">{st.score}</span>
                    </span>
                  </span>
                  <SignalTags keys={s.signals} />
                  {top ? (
                    <span className="bh-story-next" data-sev={top.severity}>
                      {top.title}: <span className="text-muted">{top.fix}</span>
                    </span>
                  ) : (
                    <span className="bh-story-next" data-sev="ok">
                      {st.stage === 'rehearsed' ? 'Ready to tell.' : 'Holds up. Rehearse it out loud in Practice.'}
                    </span>
                  )}
                  {todos > 0 && <span className="font-mono text-[12px] text-[var(--color-gold)]">{todos} to-do from debriefs</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

const sevRank = (s: 'blocker' | 'warn' | 'tip') => (s === 'blocker' ? 0 : s === 'warn' ? 1 : 2);

/** While mining: the seeds you already have, so you do not write the same one twice. */
function SeedList({ stories }: { stories: Story[] }) {
  if (!stories.length) return null;
  return (
    <section className="panel flex flex-col gap-2 p-5 lg:p-7" aria-label="Your seeds">
      <Eyebrow>Already in your catalog</Eyebrow>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {stories.map((s) => (
          <li key={s.id} className="mode-tag font-mono">
            {s.tier === 'core' ? '★ ' : ''}
            {s.title}
          </li>
        ))}
      </ul>
    </section>
  );
}
