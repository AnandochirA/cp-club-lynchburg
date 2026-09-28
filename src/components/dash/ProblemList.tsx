'use client';

import { useState } from 'react';
import { memberPage as M, rankName, rankSection } from '@/lib/content';
import type { Problem, RankKey } from '@/lib/curriculum';
import { Icon } from '../icons';

const SHOW = 12;

const diffColor = (d: string) => rankSection.difficulties.find((x) => x.label === d.toLowerCase())?.color ?? '#A7A8AA';

/**
 * The working list: every problem in the set you are on, with the same
 * solved/to-do state as the map. Also the accessible version of the map.
 */
export function ProblemList({
  focus,
  set,
  left,
  fresh,
  onHover,
}: {
  focus: RankKey;
  set: Problem[];
  /** Slugs in this set that are not solved yet. */
  left: ReadonlySet<string>;
  fresh: ReadonlySet<string>;
  onHover: (slug: string | null) => void;
}) {
  const [filter, setFilter] = useState<'all' | 'todo' | 'done'>('all');
  const [showAll, setShowAll] = useState(false);
  const [q, setQ] = useState('');

  const todoCount = left.size;
  const solvedCount = set.length - todoCount;
  const needle = q.trim().toLowerCase();
  const visible = set.filter(
    (p) =>
      (filter === 'all' ? true : filter === 'todo' ? left.has(p.slug) : !left.has(p.slug)) &&
      (needle === '' || p.title.toLowerCase().includes(needle) || String(p.id) === needle || p.topic.toLowerCase().includes(needle)),
  );
  const shown = showAll || needle ? visible : visible.slice(0, SHOW);

  return (
    <section className="panel flex flex-col gap-4 p-5 lg:p-7" aria-label={M.problemsTitle(rankName(focus))}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="flex flex-col gap-1.5">
          <span className="eyebrow-m">The working list</span>
          <h2 className="font-display caps m-0 text-[34px] leading-[0.9] font-black lg:text-[40px]">
            {M.problemsTitle(rankName(focus))}
          </h2>
        </div>
        <span className="font-mono text-[13px] text-white/55">
          <strong className="font-bold text-[#52D68A]">{solvedCount}</strong> / {set.length} {M.solvedWord}
        </span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label={M.filterLabel} className="flex flex-wrap gap-2">
          {(['all', 'todo', 'done'] as const).map((f) => {
            const n = f === 'all' ? set.length : f === 'todo' ? todoCount : solvedCount;
            const on = filter === f;
            return (
              <button
                key={f}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setFilter(f);
                  setShowAll(false);
                }}
                className={`font-mono flex min-h-9 cursor-pointer items-center gap-2 rounded-none border px-3.5 text-[13px] transition-colors ${
                  on ? 'border-white/25 bg-white/10 text-text' : 'border-white/10 bg-transparent text-muted hover:text-text'
                }`}
              >
                {M.filters[f]} <span className={on ? 'text-soft' : 'text-dim'}>{n}</span>
              </button>
            );
          })}
        </div>
        <label className="search">
          <Icon name="code" size={15} stroke={2} />
          <span className="sr-only">Search problems</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, number or topic"
            autoComplete="off"
          />
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="m-0 text-[15px] leading-[1.5] text-muted">
          {needle ? 'No problem matches that search.' : filter === 'done' ? M.nothingSolved : M.allSolved}
        </p>
      ) : (
        <ul id="problem-list" className="m-0 flex list-none flex-col gap-1.5 p-0">
          {shown.map((p) => {
            const solved = !left.has(p.slug);
            const isFresh = fresh.has(p.slug);
            return (
              <li key={p.slug} data-solved={solved ? 'true' : 'false'} data-fresh={isFresh ? 'true' : undefined}>
                <a
                  href={`https://leetcode.com/problems/${p.slug}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onPointerEnter={(e) => e.pointerType === 'mouse' && onHover(p.slug)}
                  onPointerLeave={() => onHover(null)}
                  onFocus={() => onHover(p.slug)}
                  onBlur={() => onHover(null)}
                  className={`row flex items-center gap-3 rounded-none border px-3 py-2.5 text-text no-underline transition-colors hover:text-text ${
                    solved
                      ? 'border-[#52D68A]/25 bg-[#52D68A]/[0.07] hover:bg-[#52D68A]/[0.12]'
                      : 'border-transparent bg-white/4 hover:bg-white/8'
                  } ${isFresh ? 'ring-2 ring-[#52D68A]/70' : ''}`}
                >
                  <span
                    aria-hidden="true"
                    className={`hex-tile flex size-7 shrink-0 items-center justify-center ${
                      solved ? 'bg-[#52D68A] text-[#08130D]' : 'bg-white/14'
                    } ${isFresh ? 'anim-pop' : ''}`}
                  >
                    {solved && <Icon name="check" size={14} stroke={3.4} />}
                  </span>
                  <span className="sr-only">{solved ? M.solvedWord : M.notSolvedWord}: </span>
                  <span className="font-mono w-10 shrink-0 text-[12.5px] text-dim">{p.id}</span>
                  <span className="min-w-0 flex-grow truncate text-[15.5px]">{p.title}</span>
                  <span className="font-mono hidden shrink-0 text-[12px] text-dim sm:inline">{p.topic}</span>
                  <span className="font-mono shrink-0 text-[12.5px]" style={{ color: diffColor(p.difficulty) }}>
                    {p.difficulty.toLowerCase()}
                  </span>
                  <Icon name="external" size={14} stroke={2} className="shrink-0 text-dim" />
                </a>
              </li>
            );
          })}
        </ul>
      )}

      {!needle && visible.length > SHOW && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          aria-expanded={showAll}
          aria-controls="problem-list"
          className="font-mono flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-none border border-white/10 bg-transparent px-4 text-[13px] text-soft hover:bg-white/5 hover:text-text"
        >
          {showAll ? M.showLess : M.showMore(visible.length - SHOW, rankName(focus))}
          <Icon name="chev" size={16} stroke={2.2} className={`transition-transform duration-300 ${showAll ? 'rotate-180' : ''}`} />
        </button>
      )}
    </section>
  );
}
