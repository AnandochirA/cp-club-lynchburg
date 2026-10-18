'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import '../app/dash.css';
import { apiErrors, memberPage as M, rankName, ranks, roadmap } from '@/lib/content';
import { curriculum, type RankKey } from '@/lib/curriculum';
import { apiDelete, apiPost } from '@/lib/client-api';
import { TIERS } from '@/lib/hexgrid';
import type { MemberView } from '@/lib/member-view';
import { AppBar } from './dash/AppBar';
import { Ceremony } from './dash/Ceremony';
import { InterviewReps } from './dash/InterviewReps';
import { useCalm } from './dash/hooks';
import { Momentum } from './dash/Momentum';
import { MyGrid } from './dash/MyGrid';
import { PlayerCard } from './dash/PlayerCard';
import { ProblemList } from './dash/ProblemList';
import { RoomTeaser } from './dash/RoomTeaser';
import { Topics } from './dash/Topics';
import { UpNext } from './dash/UpNext';
import { PlacementPanel } from './PlacementPanel';

const NONE: ReadonlySet<string> = new Set();

/**
 * The signed-in dashboard, "the Ascent". One instrument panel: your rank card,
 * your grid of all 250 problems, what to solve next, your pace, your skills.
 * The map and the list are the same data, so they highlight each other.
 */
export function MemberDashboard({ initial }: { initial: MemberView }) {
  const router = useRouter();
  const calm = useCalm();
  const [me, setMe] = useState(initial);
  const [busy, setBusy] = useState<'sync' | 'out' | 'delete' | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [rankedUp, setRankedUp] = useState<RankKey | null>(null);
  const [ceremony, setCeremony] = useState<RankKey | null>(null);
  const [cardKey, setCardKey] = useState(0);
  const [fresh, setFresh] = useState<ReadonlySet<string>>(NONE);
  const [hl, setHl] = useState<string | null>(null);
  const [placing, setPlacing] = useState(initial.placement?.state === 'active');
  const freshTimer = useRef(0);

  const rank = ranks.find((r) => r.key === me.rank)!;
  const next = me.nextRank ? ranks.find((r) => r.key === me.nextRank)! : null;
  const tier = TIERS[rank.level - 1];
  const solvedSet = useMemo(() => new Set(me.solved), [me.solved]);
  const set = curriculum[me.focus];
  const left = useMemo(() => new Set(me.progress.remaining), [me.progress.remaining]);
  const upNext = useMemo(
    () => me.progress.remaining.slice(0, 3).map((slug) => set.find((p) => p.slug === slug)!).filter(Boolean),
    [me.progress.remaining, set],
  );
  // Finished Ancient: the target is now Divine's 30 Hards, but the rank itself
  // still needs an officer to approve an assessment.
  const aimingAtDivine = me.focus === 'divine' && me.rank !== 'divine';
  const quota = me.focus === 'divine' ? 3 : 10;
  const finished = me.placement?.state === 'finished' ? me.placement : null;

  async function sync() {
    if (busy) return;
    setBusy('sync');
    setNote(null);
    setSyncMsg(null);
    setRankedUp(null);
    const before = new Set(me.solved);
    const res = await apiPost<{ me: MemberView; outcome: { promoted: RankKey[] } }>('/api/me/sync');
    setBusy(null);
    if (!res.ok) return setNote(apiErrors[res.error] ?? apiErrors.server);
    setMe(res.data.me);

    const promoted = res.data.outcome.promoted;
    if (promoted.length > 0) {
      const top = promoted[promoted.length - 1];
      setRankedUp(top);
      if (!calm) setCeremony(top);
    }
    const found = res.data.me.solved.filter((slug) => !before.has(slug));
    if (found.length > 0) {
      window.clearTimeout(freshTimer.current);
      setFresh(new Set(found));
      freshTimer.current = window.setTimeout(() => setFresh(NONE), 4500);
      setSyncMsg(M.newSolves(found.length));
    } else if (promoted.length === 0) {
      setSyncMsg(M.upToDate);
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

  // "S" syncs, unless you are typing or something modal is open.
  const syncRef = useRef(sync);
  syncRef.current = sync;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 's' || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (document.querySelector('dialog[open], .cere')) return;
      e.preventDefault();
      void syncRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Messages fade on their own; errors stay until the next action.
  useEffect(() => {
    if (!syncMsg) return;
    const id = setTimeout(() => setSyncMsg(null), 7000);
    return () => clearTimeout(id);
  }, [syncMsg]);

  return (
    <div className="dash" style={{ ['--tier' as string]: tier.color }}>
      <div className="dash-aurora" aria-hidden="true">
        <i />
        <i />
        <b className="hex-bg-ink" />
      </div>

      <AppBar me={me} busy={busy} onSync={sync} onSignOut={signOut} />
      <h1 className="sr-only">{M.title}</h1>

      <div className="toasts">
        {syncMsg && (
          <p role="status" className="toast" data-tone="ok">
            {syncMsg}
          </p>
        )}
        {rankedUp && (calm || !ceremony) && (
          <p role="status" className="toast" data-tone="ok">
            {M.rankedUp(rankName(rankedUp))}
          </p>
        )}
        {note && (
          <p role="alert" className="toast" data-tone="err">
            {note}
          </p>
        )}
      </div>

      <div className="dash-wrap">
        {(me.status === 'not_found' || me.gapPossible) && (
          <div className="dx" style={{ ['--dx' as string]: 0 }}>
            {me.status === 'not_found' && <p className="notice">{M.notFound}</p>}
            {me.gapPossible && <p className="notice mt-2">{M.gap}</p>}
          </div>
        )}

        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-12 xl:gap-5">
          <div className="xl:col-span-5">
            <PlayerCard key={cardKey} me={me} rank={rank} next={next} aimingAtDivine={aimingAtDivine} />
          </div>
          <div className="dx xl:col-span-7" style={{ ['--dx' as string]: 2 }}>
            <MyGrid me={me} solvedSet={solvedSet} upNext={upNext.map((p) => p.slug)} fresh={fresh} scanning={busy === 'sync'} highlight={hl} />
          </div>
        </div>

        <div className="dx" style={{ ['--dx' as string]: 5 }}>
          <UpNext
            items={upNext}
            rankName={rankName(me.focus)}
            left={left.size}
            divineReady={aimingAtDivine && left.size === 0}
            onHover={setHl}
          />
        </div>

        <div className="dx" style={{ ['--dx' as string]: 6 }}>
          <RoomTeaser room={me.rank} />
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-12 lg:gap-5">
          <div className="lg:col-span-5">
            <Momentum timeline={me.timeline} quota={quota} />
          </div>
          <div className="lg:col-span-7">
            <Topics solved={solvedSet} rank={me.rank} />
          </div>
        </div>

        <InterviewReps />

        <ProblemList focus={me.focus} set={set} left={left} fresh={fresh} onHover={setHl} />

        <section className="panel flex flex-col gap-3.5 p-5 lg:p-7" aria-label={M.placement}>
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

        <footer className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-t border-white/8 pt-6">
          <p className="m-0 max-w-[58ch] text-[13px] text-dim">{M.syncNote}</p>
          <button
            type="button"
            onClick={del}
            disabled={busy !== null}
            className="min-h-11 cursor-pointer border-0 bg-transparent p-0 font-sans text-[15px] font-semibold text-[#FF8FA1] hover:text-crimson-hi"
          >
            {M.delete}
          </button>
        </footer>
      </div>

      {ceremony && (
        <Ceremony
          rankKey={ceremony}
          onClose={() => {
            setCeremony(null);
            setCardKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
