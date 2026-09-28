'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiErrors, rankName, rankSection, ranks, roadmap } from '@/lib/content';
import { apiGet, apiPost } from '@/lib/client-api';
import type { PlacementView } from '@/lib/placement';
import { PLACEMENT_MINUTES } from '@/lib/placement-logic';
import { Icon } from './icons';
import { LinkLeetCode } from './LinkLeetCode';
import { RankBadge } from './RankBadge';

const P = roadmap.placement;
const POLL_MS = 45_000;
const SURFACE = '#101116';

type Phase = 'loading' | 'intro' | 'active' | 'result' | 'reverify';

const diffColor = (d: string) =>
  rankSection.difficulties.find((x) => x.label === d.toLowerCase())?.color ?? '#A7A8AA';

function clock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * The autonomous placement. Everything that matters (which problems, the
 * window, what counts as solved) is decided on the server; this only shows it
 * and asks the server to refresh from LeetCode now and then.
 */
export function PlacementPanel({
  username,
  beginner,
  onSkip,
  onDone,
}: {
  username: string;
  /** Said "Never coded": they start at Guardian and the test is optional. */
  beginner: boolean;
  onSkip: () => void;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [placement, setPlacement] = useState<PlacementView | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [tookAnyway, setTookAnyway] = useState(false);
  const inflight = useRef(false);
  const closedOut = useRef(false);

  const act = useCallback(async (action: 'start' | 'poll' | 'finish') => {
    if (inflight.current) return;
    inflight.current = true;
    setBusy(action);
    if (action !== 'poll') setError(null);
    const res = await apiPost<{ placement: PlacementView }>(`/api/placement/${action}`);
    inflight.current = false;
    setBusy(null);
    if (!res.ok) {
      if (res.error === 'reverify') return setPhase('reverify');
      // A quiet background poll failing is not worth shouting about.
      if (action !== 'poll') setError(apiErrors[res.error] ?? apiErrors.server);
      return;
    }
    setPlacement(res.data.placement);
    setPhase(res.data.placement.state === 'finished' ? 'result' : 'active');
  }, []);

  // What is already going on? (They may have closed the tab mid-test.)
  useEffect(() => {
    let live = true;
    apiGet<{ placement: PlacementView | null }>('/api/me').then((res) => {
      if (!live) return;
      if (!res.ok) {
        setError(apiErrors[res.error] ?? apiErrors.server);
        return setPhase('intro');
      }
      const p = res.data.placement;
      setPlacement(p);
      setPhase(p ? (p.state === 'finished' ? 'result' : 'active') : 'intro');
    });
    return () => {
      live = false;
    };
  }, []);

  const active = phase === 'active' && placement?.state === 'active';

  useEffect(() => {
    if (!active) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(() => void act('poll'), POLL_MS);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [active, act]);

  // Time is up: ask the server to close it out, once.
  const msLeft = placement ? new Date(placement.endsAt).getTime() - now : 0;
  useEffect(() => {
    if (active && msLeft <= 0 && !closedOut.current) {
      closedOut.current = true;
      void act('poll');
    }
  }, [active, msLeft, act]);

  if (phase === 'loading') {
    return <p className="m-0 text-muted">{P.checking}</p>;
  }

  if (phase === 'reverify') {
    return (
      <div className="flex flex-col gap-4">
        <p className="m-0 text-[15.5px] leading-[1.5] text-soft">{apiErrors.reverify}</p>
        <LinkLeetCode
          defaultUsername={username}
          onLinked={() => {
            setPhase('intro');
            void act('start');
          }}
        />
      </div>
    );
  }

  if (phase === 'result' && placement?.resultRank) {
    const rank = ranks.find((r) => r.key === placement.resultRank)!;
    return (
      <div className="flex flex-col items-start gap-4">
        <div className="flex items-center gap-4">
          <RankBadge rank={rank} size={72} bg={SURFACE} />
          <div className="flex flex-col gap-1">
            <span className="font-mono text-xs tracking-[0.1em] uppercase text-dim">{P.result.title}</span>
            <span className="font-display caps text-[64px] leading-[0.82] font-black">{rankName(rank.key)}</span>
            <span className="font-mono text-[13px] text-muted">{rank.countLabel}</span>
          </div>
        </div>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {placement.problems.map((p) => (
            <li key={p.slug} className="flex items-center gap-2.5 text-[15px] text-soft">
              <span
                aria-hidden="true"
                className={`flex size-6 items-center justify-center rounded-full ${
                  p.passed ? 'bg-[#52D68A]/20 text-[#52D68A]' : 'bg-white/6 text-dim'
                }`}
              >
                {p.passed ? <Icon name="check" size={13} stroke={3} /> : <span className="text-xs">·</span>}
              </span>
              <span className="text-dim">{P.tiers[p.tier - 1]}:</span> {p.title}
            </li>
          ))}
        </ul>
        {ranks.findIndex((r) => r.key === rank.key) >= 2 && (
          <p className="m-0 text-[14.5px] leading-[1.5] text-muted">{P.result.flagged}</p>
        )}
        <button
          type="button"
          onClick={onDone}
          className="btn btn-primary [clip-path:polygon(0_0,calc(100%-10px)_0,100%_10px,100%_100%,0_100%)] flex h-13 cursor-pointer items-center justify-center gap-2.5 rounded-none border-0 px-6 font-sans text-base font-semibold text-white"
        >
          <span className="sheen" aria-hidden="true" />
          {P.result.next}
          <Icon name="arrow" size={18} stroke={2.2} className="arrow" />
        </button>
      </div>
    );
  }

  if (active && placement) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-mono text-xs tracking-[0.1em] uppercase text-dim">{P.timeLeft}</span>
          <span
            className={`font-display text-[72px] leading-[0.8] font-black tabular-nums ${
              msLeft < 5 * 60_000 ? 'text-crimson-hi' : 'text-text'
            }`}
            aria-live="off"
          >
            {clock(Math.min(msLeft, PLACEMENT_MINUTES * 60_000))}
          </span>
        </div>
        <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
          {placement.problems.map((p) => (
            <li
              key={p.slug}
              className={`flex flex-col gap-2 rounded-none border p-3.5 sm:flex-row sm:items-center sm:justify-between ${
                p.passed ? 'border-[#52D68A]/40 bg-[#52D68A]/8' : 'border-white/10 bg-white/3'
              }`}
            >
              <div className="flex min-w-0 flex-col gap-1">
                <span className="font-mono text-[12px] tracking-[0.08em] uppercase text-dim">
                  {P.tiers[p.tier - 1]}
                </span>
                <span className="text-[16.5px] leading-[1.3] font-semibold text-text">{p.title}</span>
                <span className="flex items-center gap-2 font-mono text-[12.5px]">
                  <span style={{ color: diffColor(p.difficulty) }}>{p.difficulty.toLowerCase()}</span>
                  <span className={p.passed ? 'text-[#52D68A]' : 'text-dim'}>
                    {p.passed ? P.solved : P.waiting}
                  </span>
                </span>
              </div>
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost flex h-11 shrink-0 items-center justify-center gap-2 rounded-none px-4 font-sans text-[14.5px] font-semibold no-underline"
                style={{ color: 'var(--color-text)' }}
              >
                {P.open}
                <Icon name="external" size={15} stroke={2} />
              </a>
            </li>
          ))}
        </ol>
        <p className="m-0 text-[13.5px] leading-[1.5] text-dim">{P.autoNote}</p>
        {placement.syncIssue && <p className="m-0 text-[13.5px] text-gold">{P.lookedAway}</p>}
        {error && (
          <p role="alert" className="m-0 text-[15px] font-medium text-[#FF8FA1]">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={() => void act('poll')}
            disabled={busy !== null}
            className="btn btn-ghost flex h-12 cursor-pointer items-center justify-center rounded-none px-5 font-sans text-[15px] font-semibold"
            style={{ color: 'var(--color-text)' }}
          >
            {busy === 'poll' ? P.checking : P.check}
          </button>
          <button
            type="button"
            onClick={() => void act('finish')}
            disabled={busy !== null}
            className="btn btn-primary [clip-path:polygon(0_0,calc(100%-10px)_0,100%_10px,100%_100%,0_100%)] flex h-12 cursor-pointer items-center justify-center gap-2 rounded-none border-0 px-5 font-sans text-[15px] font-semibold text-white disabled:cursor-wait disabled:opacity-70"
          >
            <span className="sheen" aria-hidden="true" />
            {busy === 'finish' ? P.finishing : P.finish}
          </button>
        </div>
      </div>
    );
  }

  // intro
  if (beginner && !tookAnyway) {
    return (
      <div className="flex flex-col items-start gap-4">
        <div className="flex items-center gap-4">
          <RankBadge rank={ranks[0]} size={64} bg={SURFACE} />
          <div className="flex flex-col gap-1">
            <span className="font-display caps text-[40px] leading-[0.9] font-black">{P.beginner.title}</span>
            <span className="text-[15.5px] leading-[1.45] text-muted">{P.beginner.sub}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={onSkip}
            className="btn btn-primary [clip-path:polygon(0_0,calc(100%-10px)_0,100%_10px,100%_100%,0_100%)] flex h-13 cursor-pointer items-center justify-center rounded-none border-0 px-6 font-sans text-base font-semibold text-white"
          >
            <span className="sheen" aria-hidden="true" />
            {roadmap.close}
          </button>
          <button
            type="button"
            onClick={() => setTookAnyway(true)}
            className="btn btn-ghost flex h-13 cursor-pointer items-center justify-center rounded-none px-5 font-sans text-[15px] font-semibold"
            style={{ color: 'var(--color-text)' }}
          >
            {P.start}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-[15.5px] leading-[1.5] text-soft">{P.sub}</p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {P.tiers.map((t) => (
          <li key={t} className="flex items-center gap-2.5 font-mono text-[13.5px] text-muted">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-crimson" />
            {t}
          </li>
        ))}
      </ul>
      <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-1.5 p-0 text-[14px] text-dim">
        {P.facts.map((f) => (
          <li key={f} className="flex items-center gap-2">
            <Icon name="check" size={14} stroke={2.6} />
            {f}
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="m-0 rounded-none bg-crimson/14 px-3.5 py-3 text-[15px] leading-[1.45] font-medium text-[#FF8FA1]">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <button
          type="button"
          onClick={() => void act('start')}
          disabled={busy !== null}
          className="btn btn-primary [clip-path:polygon(0_0,calc(100%-10px)_0,100%_10px,100%_100%,0_100%)] flex h-13 cursor-pointer items-center justify-center gap-2.5 rounded-none border-0 px-6 font-sans text-base font-semibold text-white disabled:cursor-wait disabled:opacity-70"
        >
          <span className="sheen" aria-hidden="true" />
          {busy === 'start' ? P.starting : P.start}
        </button>
        <button
          type="button"
          onClick={onSkip}
          disabled={busy !== null}
          className="btn btn-ghost flex h-13 cursor-pointer items-center justify-center rounded-none px-5 font-sans text-[15px] font-semibold"
          style={{ color: 'var(--color-text)' }}
        >
          {P.skip}
        </button>
      </div>
    </div>
  );
}
