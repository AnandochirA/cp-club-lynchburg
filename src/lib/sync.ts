import 'server-only';
import { db } from '@/lib/db';
import type { RankKey } from '@/lib/curriculum';
import { RECENT_AC_CAP, LeetCodeError, fetchProfile, fetchRecentAc } from '@/lib/leetcode';
import { nextRank, rankProgress } from '@/lib/progress';
import type { MemberRow } from '@/lib/session';

/** After LeetCode refuses us (403/429), nobody calls it again for this long. */
const BREAKER_MINUTES = 10;

export async function breakerOpen(): Promise<boolean> {
  const sql = db();
  const rows = (await sql`
    select (blocked_until is not null and blocked_until > now()) as open from sync_state where id = 1
  `) as { open: boolean }[];
  return rows[0]?.open ?? false;
}

async function tripBreaker(): Promise<void> {
  const sql = db();
  await sql`
    update sync_state set blocked_until = now() + ${`${BREAKER_MINUTES} minutes`}::interval where id = 1
  `;
}

/**
 * Reserve the right to call LeetCode for this member. It is one conditional
 * UPDATE, so it works across serverless instances (which share no memory).
 * Returns false if they were called too recently.
 */
export async function claimCall(memberId: number, minSeconds: number): Promise<boolean> {
  const sql = db();
  const rows = await sql`
    update members set last_lc_call_at = now()
    where id = ${memberId}
      and (last_lc_call_at is null or last_lc_call_at < now() - (${minSeconds}::int * interval '1 second'))
    returning id
  `;
  return rows.length > 0;
}

export type SyncOutcome = {
  status: 'ok' | 'not_found';
  /** Accepted submissions LeetCode showed us this time (max 20). */
  seen: number;
  /** How many of those we had not stored before. */
  added: number;
  /** True if the newest 20 no longer reach back to what we saw last time. */
  gapPossible: boolean;
  /** Ranks the member was promoted into by this sync, in order (usually none or one). */
  promoted: RankKey[];
};

/**
 * Run ANY LeetCode call behind the circuit breaker: refuse immediately while it
 * is open, and open it (for a few minutes) the moment LeetCode refuses us.
 * Every route that reaches LeetCode goes through this.
 */
export async function guardedCall<T>(call: () => Promise<T>): Promise<T> {
  if (await breakerOpen()) throw new LeetCodeError('blocked', 'Paused: LeetCode recently refused us');
  try {
    return await call();
  } catch (err) {
    if (err instanceof LeetCodeError && err.kind === 'blocked') await tripBreaker();
    throw err;
  }
}

/**
 * Pull a member's latest Accepted submissions and append every one we have not
 * seen to `ac_events`. Idempotent: running it twice stores nothing new.
 *
 * Rules that matter:
 *  - A failure THROWS. It is never treated as "zero solves".
 *  - We store everything LeetCode shows, not just the 250, so the curriculum
 *    can change later without losing history.
 *  - An empty list is ambiguous (LeetCode returns [] for a deleted account), so
 *    only then do we ask the profile endpoint whether the account still exists.
 */
export async function syncMember(
  member: Pick<MemberRow, 'id' | 'leetcode_username' | 'last_seen_ts'>,
): Promise<SyncOutcome> {
  const sql = db();

  const recent = await guardedCall(() => fetchRecentAc(member.leetcode_username));

  if (recent.length === 0) {
    const profile = await guardedCall(() => fetchProfile(member.leetcode_username));
    const status = profile ? 'ok' : 'not_found';
    await sql`update members set status = ${status}, last_synced_at = now() where id = ${member.id}`;
    return { status, seen: 0, added: 0, gapPossible: false, promoted: [] };
  }

  const payload = JSON.stringify(recent.map((r) => ({ slug: r.slug, ts: r.ts })));
  const inserted = await sql`
    insert into ac_events (member_id, slug, ts)
    select ${member.id}::bigint, x.slug, to_timestamp(x.ts)
    from jsonb_to_recordset(${payload}::jsonb) as x(slug text, ts bigint)
    on conflict do nothing
    returning id
  `;

  const newest = Math.max(...recent.map((r) => r.ts));
  const oldest = Math.min(...recent.map((r) => r.ts));
  const prev = member.last_seen_ts ? new Date(member.last_seen_ts).getTime() / 1000 : null;
  // A full page whose oldest row is newer than the last thing we saw means
  // there may be solves between the two that we can no longer see.
  const gapPossible = recent.length >= RECENT_AC_CAP && prev !== null && oldest > prev;

  await sql`
    update members set
      status = 'ok',
      last_synced_at = now(),
      last_seen_ts = greatest(coalesce(last_seen_ts, to_timestamp(${newest})), to_timestamp(${newest})),
      gap_possible = ${gapPossible}
    where id = ${member.id}
  `;
  const promoted = await promoteIfComplete(member.id);
  return { status: 'ok', seen: recent.length, added: inserted.length, gapPossible, promoted };
}

/**
 * Rank up while the member's current rank has every problem solved. It loops,
 * because someone who finished two sets between syncs should climb two ranks.
 *
 * Rules:
 *  - It stops at Ancient. Divine needs 30 Hards AND an officer-approved
 *    assessment, so it is never automatic (an officer uses `set_rank`).
 *  - It only ever goes UP, and it is a compare-and-set on the old rank, so
 *    two syncs racing (or an officer changing the rank meanwhile) cannot make
 *    it overwrite anything.
 *  - Every promotion is written to `rank_history`.
 */
export async function promoteIfComplete(memberId: number): Promise<RankKey[]> {
  const sql = db();
  const solved = await loadSolved(memberId);
  const promoted: RankKey[] = [];
  for (let step = 0; step < 4; step++) {
    const rows = (await sql`select rank from members where id = ${memberId}`) as { rank: RankKey }[];
    const rank = rows[0]?.rank;
    if (!rank) break;
    const to = nextRank(rank);
    if (!to || to === 'divine') break;
    if (rankProgress(rank, solved).remaining.length > 0) break;
    const moved = await sql`
      update members set rank = ${to}, rank_source = 'sync'
      where id = ${memberId} and rank = ${rank}
      returning id
    `;
    if (moved.length === 0) break; // the rank changed under us; leave it alone
    await sql`
      insert into rank_history (member_id, from_rank, to_rank, actor)
      values (${memberId}, ${rank}, ${to}, 'sync')
    `;
    promoted.push(to);
  }
  return promoted;
}

/**
 * Distinct problem slugs a member has solved SINCE they linked their account.
 * Earlier solves are invisible to us (LeetCode shows only the latest 20), so
 * they count once re-submitted. Officer-revoked rows are excluded.
 */
export async function loadSolved(memberId: number): Promise<Set<string>> {
  const sql = db();
  const rows = (await sql`
    select distinct e.slug
    from ac_events e join members m on m.id = e.member_id
    where e.member_id = ${memberId} and e.revoked_at is null and e.ts >= m.created_at
  `) as { slug: string }[];
  return new Set(rows.map((r) => r.slug));
}
