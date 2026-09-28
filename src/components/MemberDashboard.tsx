'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiErrors, memberPage as M, rankName, rankSection, ranks, roadmap } from '@/lib/content';
import { curriculum, type RankKey } from '@/lib/curriculum';
import { apiDelete, apiPost } from '@/lib/client-api';
import type { MemberView } from '@/lib/member-view';
import { Icon } from './icons';
import { PlacementPanel } from './PlacementPanel';
import { RankBadge, SKIN } from './RankBadge';

const SURFACE = '#14151B';
const SHOW = 12;

const diffColor = (d: string) =>
  rankSection.difficulties.find((x) => x.label === d.toLowerCase())?.color ?? '#A7A8AA';

export function MemberDashboard({ initial }: { initial: MemberView }) {
  const router = useRouter();
  const [me, setMe] = useState(initial);
  const [busy, setBusy] = useState<'sync' | 'out' | 'delete' | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [rankedUp, setRankedUp] = useState<string | null>(null);
  // Which problems to list, and whether the list is expanded past the first few.
  const [filter, setFilter] = useState<'all' | 'todo' | 'done'>('all');
  const [showAll, setShowAll] = useState(false);
  // Problems that were just found solved by a sync: highlighted for a few seconds.
  const [justSolved, setJustSolved] = useState<Set<string>>(new Set());
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [placing, setPlacing] = useState(initial.placement?.state === 'active');

  const rank = ranks.find((r) => r.key === me.rank)!;
  const next = me.nextRank ? ranks.find((r) => r.key === me.nextRank)! : null;
  const skin = SKIN[rank.key];
  const pct = me.progress.total === 0 ? 0 : (me.progress.solved / me.progress.total) * 100;
  const set = curriculum[me.focus];
  const left = new Set(me.progress.remaining);
  const todoCount = left.size;
  const solvedCount = set.length - todoCount;
  const visible = set.filter((p) =>
    filter === 'all' ? true : filter === 'todo' ? left.has(p.slug) : !left.has(p.slug),
  );
  const shown = showAll ? visible : visible.slice(0, SHOW);
  // Finished Ancient: the target is now Divine's 30 Hards, but the rank itself
  // still needs an officer to approve an assessment.
  const aimingAtDivine = me.focus === 'divine' && me.rank !== 'divine';

  async function sync() {
    setBusy('sync');
    setNote(null);
    setRankedUp(null);
    setSyncMsg(null);
    const before = new Set(me.progress.remaining);
    const focusBefore = me.focus;
    const res = await apiPost<{ me: typeof me; outcome: { promoted: RankKey[] } }>('/api/me/sync');
    setBusy(null);
    if (!res.ok) return setNote(apiErrors[res.error] ?? apiErrors.server);
    setMe(res.data.me);
    const promoted = res.data.outcome.promoted;
    if (promoted.length > 0) setRankedUp(M.rankedUp(rankName(promoted[promoted.length - 1])));
    // Same set of problems as before? Then anything that left "to do" is newly solved.
    if (res.data.me.focus === focusBefore) {
      const after = new Set(res.data.me.progress.remaining);
      const fresh = [...before].filter((slug) => !after.has(slug));
      if (fresh.length > 0) {
        setJustSolved(new Set(fresh));
        setTimeout(() => setJustSolved(new Set()), 4000);
        setSyncMsg(M.newSolves(fresh.length));
      } else if (promoted.length === 0) {
        setSyncMsg(M.upToDate);
      }
    }
  }

  async function signOut() {
    setBusy('out');
    await apiPost('/api/me/logout');
    router.refresh();
  }

  async function del() {
    if (!window.confirm(M.deleteConfirm)) return;
    setBusy('delete');
    const res = await apiDelete('/api/me');
    if (!res.ok) {
      setBusy(null);
      return setNote(apiErrors[res.error] ?? apiErrors.server);
    }
    router.refresh();
  }

  const finished = me.placement?.state === 'finished' ? me.placement : null;

  return (
    <div className="flex flex-col gap-4">
      <section className="notch border border-white/10 bg-[#101116] flex flex-col gap-4 p-5 lg:p-7" aria-label={M.rank}>
        <div className="flex items-center gap-4">
          <RankBadge rank={rank} size={72} bg={SURFACE} />
          <div className="flex min-w-0 flex-grow flex-col gap-1">
            <span className="font-mono text-xs tracking-[0.1em] uppercase" style={{ color: skin.label }}>
              {M.rank} · Level {rank.level}
            </span>
            <span className="font-display caps text-[64px] leading-[0.82] font-black lg:text-[84px]">
              {rank.name}
            </span>
            <span className="font-mono truncate text-[13px] text-dim">
              {M.linkedAs}: {me.username}
            </span>
          </div>
          {next && (
            <div className="flex shrink-0 flex-col items-center gap-1.5">
              <RankBadge rank={next} size={44} dim pip={false} effects={false} bg={SURFACE} />
              <span className="font-mono text-xs tracking-[0.08em] uppercase text-dim">{M.next}</span>
            </div>
          )}
        </div>

        <div
          role="progressbar"
          aria-label={M.inRank(me.progress.solved, me.progress.total, next ? rankName(next.key) : null)}
          aria-valuemin={0}
          aria-valuemax={me.progress.total}
          aria-valuenow={me.progress.solved}
          className="h-2.5 overflow-hidden rounded-none bg-white/8"
        >
          <div className="h-full rounded-none transition-[width] duration-700" style={{ width: `${pct}%`, background: skin.pip }} />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-base text-text">
            <strong className="font-bold">{M.inRank(me.progress.solved, me.progress.total, next ? rankName(next.key) : null)}</strong>
          </span>
          <span className="font-mono text-[13px] text-dim">{M.total(me.totalSolved, me.totalProblems)}</span>
        </div>

        {rankedUp && (
          <p role="status" className="font-display m-0 rounded-none bg-[#52D68A]/14 px-3.5 py-3 text-[19px] font-bold text-[#52D68A]">
            {rankedUp}
          </p>
        )}
        {aimingAtDivine && <p className="m-0 text-[15px] leading-[1.5] text-gold">{M.divineNote}</p>}
        {me.status === 'not_found' && <p className="m-0 text-[15px] leading-[1.5] text-gold">{M.notFound}</p>}
        {me.gapPossible && <p className="m-0 text-[15px] leading-[1.5] text-gold">{M.gap}</p>}

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={sync}
            disabled={busy !== null}
            className="btn btn-primary [clip-path:polygon(0_0,calc(100%-10px)_0,100%_10px,100%_100%,0_100%)] flex h-12 cursor-pointer items-center justify-center gap-2 rounded-none border-0 px-5 font-sans text-[15px] font-semibold text-white disabled:cursor-wait disabled:opacity-70"
          >
            <span className="sheen" aria-hidden="true" />
            {busy === 'sync' ? M.syncing : M.sync}
          </button>
          <span className="font-mono text-[12.5px] text-dim">
            {M.lastSynced}: {me.lastSyncedAt ? new Date(me.lastSyncedAt).toLocaleString() : M.never}
          </span>
        </div>
        {syncMsg && (
          <p role="status" className="font-mono m-0 text-[13.5px] font-medium text-[#52D68A]">
            {syncMsg}
          </p>
        )}
        <p className="m-0 text-[13px] text-dim">{M.syncNote}</p>
        {note && (
          <p role="alert" className="m-0 text-[15px] font-medium text-[#FF8FA1]">
            {note}
          </p>
        )}
      </section>

      <section className="notch border border-white/10 bg-[#101116] flex flex-col gap-3.5 p-5 lg:p-7" aria-label={M.placement}>
        <h2 className="font-display caps m-0 text-[34px] leading-[0.95] font-black">{M.placement}</h2>
        {placing ? (
          <PlacementPanel
            username={me.username}
            beginner={false}
            onSkip={() => setPlacing(false)}
            onDone={() => {
              setPlacing(false);
              router.refresh();
            }}
          />
        ) : finished?.resultRank ? (
          <p className="m-0 text-[15.5px] text-soft">
            {roadmap.placement.result.title} <strong>{rankName(finished.resultRank)}</strong>
          </p>
        ) : (
          <button
            type="button"
            onClick={() => setPlacing(true)}
            className="btn btn-ghost flex h-12 w-fit cursor-pointer items-center justify-center rounded-none px-5 font-sans text-[15px] font-semibold"
            style={{ color: 'var(--color-text)' }}
          >
            {M.takePlacement}
          </button>
        )}
      </section>

      {todoCount === 0 && aimingAtDivine && (
        <p className="notch border border-white/10 bg-[#101116] m-0 p-5 text-[16px] leading-[1.5] text-soft lg:p-7">{M.divineReady}</p>
      )}
      <section
        className="notch border border-white/10 bg-[#101116] flex flex-col gap-4 p-5 lg:p-7"
        aria-label={M.problemsTitle(rankName(me.focus))}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="font-display caps m-0 text-[34px] leading-[0.95] font-black">{M.problemsTitle(rankName(me.focus))}</h2>
          <span className="font-mono text-[13px] text-dim">
            <strong className="font-bold text-[#52D68A]">{solvedCount}</strong> / {set.length} {M.solvedWord}
          </span>
        </div>

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
                className={`font-mono flex min-h-9 cursor-pointer items-center gap-2 rounded-none border px-3.5 text-[13px] ${
                  on
                    ? 'border-white/25 bg-white/10 text-text'
                    : 'border-white/10 bg-transparent text-muted hover:text-text'
                }`}
              >
                {M.filters[f]}{' '}
                <span className={on ? 'text-soft' : 'text-dim'}>{n}</span>
              </button>
            );
          })}
        </div>

        {visible.length === 0 ? (
          <p className="m-0 text-[15px] leading-[1.5] text-muted">
            {filter === 'done' ? M.nothingSolved : M.allSolved}
          </p>
        ) : (
          <ul id="problem-list" className="m-0 flex list-none flex-col gap-1.5 p-0">
            {shown.map((p) => {
              const solved = !left.has(p.slug);
              const fresh = justSolved.has(p.slug);
              return (
                <li key={p.slug} data-solved={solved ? 'true' : 'false'} data-fresh={fresh ? 'true' : undefined}>
                  <a
                    href={`https://leetcode.com/problems/${p.slug}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-3 rounded-none border px-3 py-2.5 text-text no-underline transition-colors hover:text-text ${
                      solved
                        ? 'border-[#52D68A]/25 bg-[#52D68A]/[0.07] hover:bg-[#52D68A]/[0.12]'
                        : 'border-transparent bg-white/4 hover:bg-white/8'
                    } ${fresh ? 'ring-2 ring-[#52D68A]/70' : ''}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`hex-tile flex size-7 shrink-0 items-center justify-center ${
                        solved
                          ? 'bg-[#52D68A] text-[#08130D]'
                          : 'bg-white/14'
                      } ${fresh ? 'anim-pop' : ''}`}
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

        {visible.length > SHOW && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            aria-expanded={showAll}
            aria-controls="problem-list"
            className="font-mono flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-none border border-white/10 bg-transparent px-4 text-[13px] text-soft hover:bg-white/5 hover:text-text"
          >
            {showAll ? M.showLess : M.showMore(visible.length - SHOW, rankName(me.focus))}
            <Icon
              name="chev"
              size={16}
              stroke={2.2}
              className={`transition-transform duration-300 ${showAll ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </section>

      <div className="flex flex-wrap gap-x-6 gap-y-1 pt-1">
        <button
          type="button"
          onClick={signOut}
          disabled={busy !== null}
          className="min-h-11 cursor-pointer border-0 bg-transparent p-0 font-sans text-[15px] font-semibold text-soft hover:text-text"
        >
          {M.signOut}
        </button>
        <button
          type="button"
          onClick={del}
          disabled={busy !== null}
          className="min-h-11 cursor-pointer border-0 bg-transparent p-0 font-sans text-[15px] font-semibold text-[#FF8FA1] hover:text-crimson-hi"
        >
          {M.delete}
        </button>
      </div>
    </div>
  );
}
