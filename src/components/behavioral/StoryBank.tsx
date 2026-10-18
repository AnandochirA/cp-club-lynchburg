'use client';

import { useEffect, useState } from 'react';
import { apiErrors } from '@/lib/content';
import { apiDelete, apiPost } from '@/lib/client-api';
import { COMPETENCIES, STAR, behavioralCopy as B, behavioralErrors, competencyByKey, type CompetencyKey } from '@/lib/behavioral-kit';
import { MAX_STORY_FIELD, MAX_STORY_TITLE, MAX_STORIES, type Story, type StoryInput } from '@/lib/behavioral-logic';
import { Icon } from '../icons';

const FIELD = { s: 'situation', t: 'task', a: 'action', r: 'result' } as const;
const empty = (tags: CompetencyKey[] = []): StoryInput => ({ title: '', situation: '', task: '', action: '', result: '', tags });

/**
 * Your STAR stories. Each is a title, the four beats, and the competencies it
 * can answer. Six to eight good stories cover most loops.
 */
export function StoryBank({
  stories,
  onChange,
  startTag,
  onStartTagUsed,
}: {
  stories: Story[];
  onChange: (s: Story[]) => void;
  /** Opened from a gap hexagon: start a new story already tagged with it. */
  startTag: CompetencyKey | null;
  onStartTagUsed: () => void;
}) {
  const [editing, setEditing] = useState<{ id: number | null; v: StoryInput } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!startTag) return;
    setEditing({ id: null, v: empty([startTag]) });
    onStartTagUsed();
  }, [startTag, onStartTagUsed]);

  async function save() {
    if (!editing) return;
    setBusy(true);
    setError(null);
    const res = await apiPost<{ story: Story }>('/api/behavioral/stories', { ...editing.v, id: editing.id ?? undefined });
    setBusy(false);
    if (!res.ok) return setError(behavioralErrors[res.error] ?? apiErrors[res.error] ?? apiErrors.server);
    const s = res.data.story;
    onChange([s, ...stories.filter((x) => x.id !== s.id)]);
    setEditing(null);
  }

  async function remove(id: number) {
    if (!window.confirm(B.deleteConfirm)) return;
    const res = await apiDelete(`/api/behavioral/stories/${id}`);
    if (!res.ok) return setError(apiErrors[res.error] ?? apiErrors.server);
    onChange(stories.filter((x) => x.id !== id));
    if (editing?.id === id) setEditing(null);
  }

  const set = (patch: Partial<StoryInput>) => setEditing((e) => (e ? { ...e, v: { ...e.v, ...patch } } : e));

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}

      {editing ? (
        <section className="panel flex flex-col gap-5 p-5 lg:p-8" aria-labelledby="story-edit">
          <h2 id="story-edit" className="font-display caps m-0 text-[38px] leading-[0.9] font-black">
            {editing.id ? B.editStory : B.newStory}
          </h2>
          <label className="flex flex-col gap-2">
            <span className="font-mono text-[12px] tracking-[0.1em] text-dim uppercase">{B.storyTitle}</span>
            <input
              className="iv-input"
              value={editing.v.title}
              maxLength={MAX_STORY_TITLE}
              placeholder={B.storyTitlePlaceholder}
              onChange={(e) => set({ title: e.target.value })}
            />
          </label>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
            {STAR.map((b) => (
              <label key={b.key} className="bh-field flex flex-col gap-2">
                <span className="flex items-baseline gap-2">
                  <b className="bh-field-letter font-display">{b.key.toUpperCase()}</b>
                  <span className="text-[15px] font-semibold text-text">{b.title}</span>
                  <span className="text-[12.5px] text-dim">{b.hint}</span>
                </span>
                <textarea
                  className="iv-notes"
                  rows={b.key === 'a' ? 6 : 3}
                  maxLength={MAX_STORY_FIELD}
                  value={editing.v[FIELD[b.key]]}
                  onChange={(e) => set({ [FIELD[b.key]]: e.target.value })}
                />
              </label>
            ))}
          </div>
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-2 p-0 font-mono text-[12px] tracking-[0.1em] text-dim uppercase">{B.tags}</legend>
            <div className="flex flex-wrap gap-2">
              {COMPETENCIES.map((c) => (
                <label key={c.key} className="iv-chip bh-tag">
                  <input
                    type="checkbox"
                    checked={editing.v.tags.includes(c.key)}
                    onChange={() =>
                      set({ tags: editing.v.tags.includes(c.key) ? editing.v.tags.filter((t) => t !== c.key) : [...editing.v.tags, c.key] })
                    }
                  />
                  <span>{c.title}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap items-center gap-4 border-t border-white/8 pt-5">
            <button
              type="button"
              onClick={save}
              disabled={busy || !editing.v.title.trim()}
              className="btn btn-primary [clip-path:polygon(0_0,calc(100%-10px)_0,100%_10px,100%_100%,0_100%)] flex h-12 cursor-pointer items-center gap-2 rounded-none border-0 px-6 font-sans text-[15px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="sheen" aria-hidden="true" />
              {B.saveStory}
            </button>
            <button type="button" className="iv-link" onClick={() => setEditing(null)}>
              {B.cancel}
            </button>
          </div>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setEditing({ id: null, v: empty() })}
          disabled={stories.length >= MAX_STORIES}
          className="btn btn-ghost flex h-12 w-fit cursor-pointer items-center gap-2 rounded-none px-5 text-[15px] font-semibold"
        >
          <Icon name="plus" size={16} stroke={2.4} />
          {B.newStory}
        </button>
      )}

      {stories.length === 0 && !editing ? (
        <p className="panel m-0 p-5 text-[15px] leading-[1.55] text-muted lg:p-7">{B.storiesEmpty}</p>
      ) : (
        <ul className="bh-stories m-0 list-none p-0">
          {stories.map((s) => (
            <li key={s.id} className="bh-story">
              <div className="flex items-start justify-between gap-3">
                <h3 className="m-0 text-[18px] leading-[1.25] font-semibold text-text">{s.title}</h3>
                <div className="flex shrink-0 gap-3">
                  <button type="button" className="iv-link" onClick={() => setEditing({ id: s.id, v: { ...s } })}>
                    Edit
                  </button>
                  <button type="button" className="iv-link" onClick={() => remove(s.id)}>
                    {B.deleteStory}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {s.tags.map((t) => (
                  <span key={t} className="mode-tag font-mono">
                    {competencyByKey(t).title}
                  </span>
                ))}
              </div>
              <dl className="bh-story-beats m-0">
                {STAR.map((b) =>
                  s[FIELD[b.key]] ? (
                    <div key={b.key}>
                      <dt className="font-display">{b.key.toUpperCase()}</dt>
                      <dd>{s[FIELD[b.key]]}</dd>
                    </div>
                  ) : null,
                )}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
