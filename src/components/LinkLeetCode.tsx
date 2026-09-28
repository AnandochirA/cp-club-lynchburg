'use client';

import { useState } from 'react';
import { apiErrors, roadmap } from '@/lib/content';
import type { RankKey } from '@/lib/curriculum';
import { apiPost } from '@/lib/client-api';
import { Icon } from './icons';

const L = roadmap.link;

const INPUT =
  'field h-13 w-full min-w-0 rounded-xl bg-white px-3.5 font-sans text-[17px] text-ink-text';

type Linked = { username: string; rank: RankKey; isNew: boolean };

/**
 * Prove you control a LeetCode account: get a code, paste it into your
 * LeetCode "About me", press Verify. Also how a returning member signs back in.
 * Used in the post-signup popup, on the profile page, and to re-verify.
 */
export function LinkLeetCode({
  claim,
  defaultUsername = '',
  onLinked,
}: {
  /** One-time claim from a signup that just happened, so the link attaches to it. */
  claim?: string;
  defaultUsername?: string;
  onLinked: (m: Linked) => void;
}) {
  const [username, setUsername] = useState(defaultUsername);
  const [challenge, setChallenge] = useState<{ id: string; code: string } | null>(null);
  const [busy, setBusy] = useState<'code' | 'verify' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fail = (code: string) => setError(apiErrors[code] ?? apiErrors.server);

  async function getCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy('code');
    setError(null);
    const res = await apiPost<{ challengeId: string; code: string }>('/api/leetcode/link', {
      username: username.trim(),
      claim,
    });
    setBusy(null);
    if (!res.ok) return fail(res.error);
    setChallenge({ id: res.data.challengeId, code: res.data.code });
  }

  async function verify() {
    if (!challenge) return;
    setBusy('verify');
    setError(null);
    const res = await apiPost<{ member: { username: string; rank: RankKey }; isNew: boolean }>(
      '/api/leetcode/verify',
      { challengeId: challenge.id },
    );
    setBusy(null);
    if (!res.ok) {
      // A dead code is not worth retrying: drop back to the first step.
      if (['expired', 'too_many_attempts', 'already_used'].includes(res.error)) setChallenge(null);
      return fail(res.error);
    }
    onLinked({ username: res.data.member.username, rank: res.data.member.rank, isNew: res.data.isNew });
  }

  async function copy() {
    if (!challenge) return;
    try {
      await navigator.clipboard.writeText(challenge.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* the code is on screen; selecting it by hand still works */
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {!challenge ? (
        <form onSubmit={getCode} className="flex flex-col gap-3">
          <label htmlFor="lc-user" className="text-[15px] font-semibold text-text">
            {L.username.label}
          </label>
          <input
            id="lc-user"
            name="username"
            type="text"
            required
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={L.username.placeholder}
            className={INPUT}
          />
          <button
            type="submit"
            disabled={busy !== null || username.trim() === ''}
            className="btn btn-primary mt-1 flex h-13 cursor-pointer items-center justify-center gap-2.5 rounded-[14px] border-0 font-sans text-base font-semibold text-white disabled:cursor-wait disabled:opacity-70"
          >
            <span className="sheen" aria-hidden="true" />
            {busy === 'code' ? L.gettingCode : L.getCode}
          </button>
          <p className="m-0 text-sm leading-[1.5] text-muted">{L.returning}</p>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs tracking-[0.1em] uppercase text-dim">{L.codeLabel}</span>
            <div className="flex items-center gap-3 rounded-2xl border border-white/12 bg-black/30 p-3 pl-4">
              <code className="font-mono min-w-0 flex-grow text-[22px] font-bold tracking-[0.06em] text-gold select-all lg:text-[26px]">
                {challenge.code}
              </code>
              <button
                type="button"
                onClick={copy}
                className="btn btn-ghost flex h-10 shrink-0 cursor-pointer items-center rounded-[10px] px-3.5 font-sans text-sm font-semibold"
                style={{ color: 'var(--color-text)' }}
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <span className="font-mono text-[12.5px] text-dim">{L.expiry}</span>
          </div>

          <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
            {L.steps.map((s, i) => (
              <li key={s} className="flex items-start gap-3 text-[15.5px] leading-[1.45] text-soft">
                <span
                  aria-hidden="true"
                  className="font-mono mt-px flex size-6 shrink-0 items-center justify-center rounded-lg bg-white/8 text-[12.5px] font-bold text-crimson-hi"
                >
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>

          <div className="flex flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={verify}
              disabled={busy !== null}
              className="btn btn-primary flex h-13 flex-grow cursor-pointer items-center justify-center gap-2.5 rounded-[14px] border-0 font-sans text-base font-semibold text-white disabled:cursor-wait disabled:opacity-70"
            >
              <span className="sheen" aria-hidden="true" />
              {busy === 'verify' ? L.verifying : L.verify}
              {busy !== 'verify' && <Icon name="check" size={18} stroke={2.6} />}
            </button>
            <button
              type="button"
              onClick={() => {
                setChallenge(null);
                setError(null);
              }}
              disabled={busy !== null}
              className="btn btn-ghost flex h-13 cursor-pointer items-center justify-center rounded-[14px] px-5 font-sans text-[15px] font-semibold"
              style={{ color: 'var(--color-text)' }}
            >
              {L.restart}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="m-0 rounded-xl bg-crimson/14 px-3.5 py-3 text-[15px] leading-[1.45] font-medium text-[#FF8FA1]">
          {error}
        </p>
      )}
      <p className="m-0 text-[13px] leading-[1.5] text-dim">{L.privacy}</p>
    </div>
  );
}
