'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiErrors, memberPage as M, rankName, rankSection, ranks, roadmap } from '@/lib/content';
import { curriculum, type RankKey } from '@/lib/curriculum';
import { apiDelete, apiPost } from '@/lib/client-api';
import type { MemberView } from '@/lib/member-view';
import { Icon } from './icons';
import { LinkLeetCode } from './LinkLeetCode';
import { PlacementPanel } from './PlacementPanel';
import { RankBadge, SKIN } from './RankBadge';

const SURFACE = '#14151B';
const SHOW = 12;

const diffColor = (d: string) =>
  rankSection.difficulties.find((x) => x.label === d.toLowerCase())?.color ?? '#A7A8AA';

/** The signed-out view: prove you own your LeetCode account to see your progress. */
export function MeSignIn() {
  const router = useRouter();
  return (
    <div className="card-d flex flex-col gap-4 rounded-[22px] p-5 lg:p-8">
      <h2 className="font-display m-0 text-[28px] leading-[1.1] font-extrabold lg:text-[34px]">
        {M.signedOut.title}
      </h2>
      <p className="m-0 text-[15.5px] leading-[1.5] text-muted">{M.signedOut.sub}</p>
      <LinkLeetCode onLinked={() => router.refresh()} />
    </div>
  );
}

export function MemberDashboard({ initial }: { initial: MemberView }) {
  const router = useRouter();
  const [me, setMe] = useState(initial);
  const [busy, setBusy] = useState<'sync' | 'out' | 'delete' | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [rankedUp, setRankedUp] = useState<string | null>(null);
  const [placing, setPlacing] = useState(initial.placement?.state === 'active');

  const rank = ranks.find((r) => r.key === me.rank)!;
  const next = me.nextRank ? ranks.find((r) => r.key === me.nextRank)! : null;
  const skin = SKIN[rank.key];
  const pct = me.progress.total === 0 ? 0 : (me.progress.solved / me.progress.total) * 100;
  const left = new Set(me.progress.remaining);
  const todo = curriculum[me.focus].filter((p) => left.has(p.slug));
  // Finished Ancient: the target is now Divine's 30 Hards, but the rank itself
  // still needs an officer to approve an assessment.
  const aimingAtDivine = me.focus === 'divine' && me.rank !== 'divine';

  async function sync() {
    setBusy('sync');
    setNote(null);
    setRankedUp(null);
    const res = await apiPost<{ me: typeof me; outcome: { promoted: RankKey[] } }>('/api/me/sync');
    setBusy(null);
    if (!res.ok) return setNote(apiErrors[res.error] ?? apiErrors.server);
    setMe(res.data.me);
    const promoted = res.data.outcome.promoted;
    if (promoted.length > 0) setRankedUp(M.rankedUp(rankName(promoted[promoted.length - 1])));
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
      <section className="card-d flex flex-col gap-4 rounded-[22px] p-5 lg:p-7" aria-label={M.rank}>
        <div className="flex items-center gap-4">
          <RankBadge rank={rank} size={72} bg={SURFACE} />
          <div className="flex min-w-0 flex-grow flex-col gap-1">
            <span className="font-mono text-xs tracking-[0.1em] uppercase" style={{ color: skin.label }}>
              {M.rank} · Level {rank.level}
            </span>
            <span className="font-display text-[34px] leading-none font-extrabold lg:text-[40px]">
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
          className="h-2.5 overflow-hidden rounded-full bg-white/8"
        >
          <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${pct}%`, background: skin.pip }} />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-base text-text">
            <strong className="font-bold">{M.inRank(me.progress.solved, me.progress.total, next ? rankName(next.key) : null)}</strong>
          </span>
          <span className="font-mono text-[13px] text-dim">{M.total(me.totalSolved, me.totalProblems)}</span>
        </div>

        {rankedUp && (
          <p role="status" className="font-display m-0 rounded-xl bg-[#52D68A]/14 px-3.5 py-3 text-[19px] font-bold text-[#52D68A]">
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
            className="btn btn-primary flex h-12 cursor-pointer items-center justify-center gap-2 rounded-[14px] border-0 px-5 font-sans text-[15px] font-semibold text-white disabled:cursor-wait disabled:opacity-70"
          >
            <span className="sheen" aria-hidden="true" />
            {busy === 'sync' ? M.syncing : M.sync}
          </button>
          <span className="font-mono text-[12.5px] text-dim">
            {M.lastSynced}: {me.lastSyncedAt ? new Date(me.lastSyncedAt).toLocaleString() : M.never}
          </span>
        </div>
        <p className="m-0 text-[13px] text-dim">{M.syncNote}</p>
        {note && (
          <p role="alert" className="m-0 text-[15px] font-medium text-[#FF8FA1]">
            {note}
          </p>
        )}
      </section>

      <section className="card-d flex flex-col gap-3.5 rounded-[22px] p-5 lg:p-7" aria-label={M.placement}>
        <h2 className="font-display m-0 text-[22px] font-bold">{M.placement}</h2>
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
            className="btn btn-ghost flex h-12 w-fit cursor-pointer items-center justify-center rounded-[14px] px-5 font-sans text-[15px] font-semibold"
            style={{ color: 'var(--color-text)' }}
          >
            {M.takePlacement}
          </button>
        )}
      </section>

      {todo.length === 0 && aimingAtDivine && (
        <p className="card-d m-0 rounded-[22px] p-5 text-[16px] leading-[1.5] text-soft lg:p-7">{M.divineReady}</p>
      )}
      {todo.length > 0 && (
        <section className="card-d flex flex-col gap-3 rounded-[22px] p-5 lg:p-7" aria-label={M.remaining}>
          <h2 className="font-display m-0 text-[22px] font-bold">
            {me.focus === me.rank ? M.remaining : M.remainingDivine}
          </h2>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {todo.slice(0, SHOW).map((p) => (
              <li key={p.slug}>
                <a
                  href={`https://leetcode.com/problems/${p.slug}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl bg-white/4 px-3.5 py-2.5 text-text no-underline hover:bg-white/8 hover:text-text"
                >
                  <span className="font-mono w-10 shrink-0 text-[12.5px] text-dim">{p.id}</span>
                  <span className="min-w-0 flex-grow truncate text-[15.5px]">{p.title}</span>
                  <span className="font-mono hidden shrink-0 text-[12px] text-dim sm:inline">{p.topic}</span>
                  <span className="font-mono shrink-0 text-[12.5px]" style={{ color: diffColor(p.difficulty) }}>
                    {p.difficulty.toLowerCase()}
                  </span>
                  <Icon name="external" size={14} stroke={2} className="shrink-0 text-dim" />
                </a>
              </li>
            ))}
          </ul>
          {todo.length > SHOW && (
            <p className="font-mono m-0 text-[12.5px] text-dim">
              + {todo.length - SHOW} more in {rankName(me.focus)}
            </p>
          )}
        </section>
      )}

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
