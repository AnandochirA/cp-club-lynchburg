import 'server-only';
import { randomInt } from 'node:crypto';
import { db } from '@/lib/db';
import type { RankKey } from '@/lib/curriculum';
import { LeetCodeError } from '@/lib/leetcode';
import {
  COOLDOWN_DAYS,
  GRACE_SECONDS,
  PLACEMENT_MINUTES,
  REVERIFY_MINUTES,
  inWindow,
  shouldFlag,
  startRank,
} from '@/lib/placement-logic';
import { PLACEMENT_POOL, type PoolProblem } from '@/lib/placement-pool';
import { rankIndex } from '@/lib/progress';
import { claimCall, syncMember } from '@/lib/sync';
import type { MemberRow, Session } from '@/lib/session';

/**
 * Autonomous placement: four LeetCode problems, one per tier, picked server-side
 * at Start from a pool the browser never sees. A tier is passed if LeetCode
 * shows an Accepted submission for its problem inside the window.
 *
 * Passes are always derived from the stored `ac_events` log, never from what
 * one poll happened to return, so LeetCode's 20-row cap cannot lose a pass.
 */

export type PlacementProblemView = {
  tier: number;
  id: number;
  title: string;
  slug: string;
  url: string;
  difficulty: string;
  passed: boolean;
};

export type PlacementView = {
  id: number;
  state: 'active' | 'finished';
  startedAt: string;
  endsAt: string;
  finishedAt: string | null;
  resultRank: RankKey | null;
  problems: PlacementProblemView[];
  /** True when LeetCode could not be reached on this refresh. */
  syncIssue?: boolean;
};

export class PlacementError extends Error {
  constructor(
    public code: 'reverify' | 'cooldown' | 'unavailable',
    message: string,
    public retryAt?: string,
  ) {
    super(message);
    this.name = 'PlacementError';
  }
}

type PlacementRow = {
  id: number;
  member_id: number;
  started_at: Date | string;
  ends_at: Date | string;
  problems: string[];
  snapshot_slugs: string[];
  result_rank: RankKey | null;
  flagged: boolean;
  finished_at: Date | string | null;
  expired: boolean;
  cooling: boolean;
  retry_at: Date | string;
};

const BY_SLUG = new Map<string, PoolProblem & { tier: number }>();
PLACEMENT_POOL.forEach((tier, i) => tier.forEach((p) => BY_SLUG.set(p.slug, { ...p, tier: i + 1 })));

const iso = (d: Date | string) => new Date(d).toISOString();

async function latest(memberId: number): Promise<PlacementRow | null> {
  const sql = db();
  const rows = (await sql`
    select p.*,
      (p.finished_at is null and now() > p.ends_at + (${GRACE_SECONDS}::int * interval '1 second')) as expired,
      (p.started_at > now() - (${COOLDOWN_DAYS}::int * interval '1 day')) as cooling,
      p.started_at + (${COOLDOWN_DAYS}::int * interval '1 day') as retry_at
    from placements p
    where p.member_id = ${memberId}
    order by p.started_at desc
    limit 1
  `) as PlacementRow[];
  return rows[0] ?? null;
}

/** Which of the four tiers were solved inside the window, from the stored log. */
async function passedTiers(row: PlacementRow): Promise<boolean[]> {
  const sql = db();
  const events = (await sql`
    select slug, extract(epoch from ts)::bigint as ts
    from ac_events
    where member_id = ${row.member_id}
      and revoked_at is null
      and slug in (select jsonb_array_elements_text(${JSON.stringify(row.problems)}::jsonb))
  `) as { slug: string; ts: string | number }[];
  const start = new Date(row.started_at).getTime();
  const end = new Date(row.ends_at).getTime();
  return row.problems.map((slug) => events.some((e) => e.slug === slug && inWindow(Number(e.ts), start, end)));
}

function view(row: PlacementRow, passed: boolean[], syncIssue?: boolean): PlacementView {
  return {
    id: row.id,
    state: row.finished_at ? 'finished' : 'active',
    startedAt: iso(row.started_at),
    endsAt: iso(row.ends_at),
    finishedAt: row.finished_at ? iso(row.finished_at) : null,
    resultRank: row.result_rank,
    syncIssue,
    problems: row.problems.map((slug, i) => {
      const p = BY_SLUG.get(slug);
      return {
        tier: i + 1,
        id: p?.id ?? 0,
        title: p?.title ?? slug,
        slug,
        url: `https://leetcode.com/problems/${slug}/`,
        difficulty: p?.difficulty ?? '',
        passed: passed[i] ?? false,
      };
    }),
  };
}

/** Record the result. Safe to call twice: only the first call changes anything. */
async function finalize(row: PlacementRow, passed: boolean[]): Promise<void> {
  const sql = db();
  const rank = startRank(passed);
  const flagged = row.flagged || shouldFlag(rank);
  const done = await sql`
    update placements set finished_at = now(), result_rank = ${rank}, flagged = ${flagged}
    where id = ${row.id} and finished_at is null
    returning id
  `;
  if (done.length === 0) return;
  // Placement may only RAISE a rank, and never touches one an officer set. So
  // someone who already earned Legend by solving is not dropped to Archon by a
  // modest placement, and a rank set by hand stays put. The update is a
  // compare-and-set on the rank we just read.
  const current = (await sql`
    select rank, rank_source from members where id = ${row.member_id}
  `) as { rank: RankKey; rank_source: string }[];
  if (current.length === 0 || current[0].rank_source === 'admin') return;
  if (rankIndex(rank) <= rankIndex(current[0].rank)) return;
  const changed = await sql`
    update members set rank = ${rank}, rank_source = 'placement'
    where id = ${row.member_id} and rank = ${current[0].rank}
    returning id
  `;
  if (changed.length > 0) {
    await sql`
      insert into rank_history (member_id, from_rank, to_rank, actor)
      values (${row.member_id}, ${current[0].rank}, ${rank}, 'placement')
    `;
  }
}

/** Refresh from LeetCode if we are allowed to. Returns true if LeetCode could not be reached. */
async function trySync(member: MemberRow, minSeconds: number): Promise<boolean> {
  if (!(await claimCall(member.id, minSeconds))) return false; // called very recently; the log is fresh enough
  try {
    await syncMember(member);
    return false;
  } catch (err) {
    if (err instanceof LeetCodeError) return true;
    throw err;
  }
}

async function recentSlugs(memberId: number): Promise<Set<string>> {
  const sql = db();
  const rows = (await sql`
    select distinct slug from (
      select slug from ac_events where member_id = ${memberId} order by ts desc limit 20
    ) t
  `) as { slug: string }[];
  return new Set(rows.map((r) => r.slug));
}

export async function startPlacement(session: Session): Promise<PlacementView> {
  const { member, verifiedAt } = session;
  const existing = await latest(member.id);

  if (existing && !existing.finished_at) {
    const passed = await passedTiers(existing);
    if (!existing.expired) return view(existing, passed); // resume the one in progress
    await finalize(existing, passed); // it timed out unnoticed; close it out first
  }
  const prior = existing ? await latest(member.id) : null;
  if (prior?.cooling) {
    throw new PlacementError('cooldown', 'One placement per 30 days.', iso(prior.retry_at));
  }

  // A session proves control of the account at one moment. Placement decides a
  // rank, so ask for a fresh proof.
  if (Date.now() - verifiedAt.getTime() > REVERIFY_MINUTES * 60_000) {
    throw new PlacementError('reverify', 'Verify your LeetCode account again to start.');
  }

  // Refresh what we know so the "already solved" snapshot is current. If we
  // cannot see LeetCode at all, do not start a timed test we cannot observe.
  if (await trySync(member, 20)) {
    throw new PlacementError('unavailable', 'LeetCode is not reachable right now. Try again in a few minutes.');
  }
  const seen = await recentSlugs(member.id);

  let flagged = false;
  const slugs = PLACEMENT_POOL.map((tier) => {
    let candidates = tier.filter((p) => !seen.has(p.slug));
    if (candidates.length === 0) {
      candidates = tier; // every option is in their recent history; pick anyway and flag it
      flagged = true;
    }
    return candidates[randomInt(candidates.length)].slug;
  });

  const sql = db();
  const created = (await sql`
    insert into placements (member_id, ends_at, problems, snapshot_slugs, flagged)
    values (
      ${member.id},
      now() + ${`${PLACEMENT_MINUTES} minutes`}::interval,
      ${JSON.stringify(slugs)}::jsonb,
      ${JSON.stringify([...seen])}::jsonb,
      ${flagged}
    )
    returning id
  `) as { id: number }[];
  const row = await latest(member.id);
  if (!row || row.id !== created[0].id) throw new Error('placement vanished after insert');
  return view(row, slugs.map(() => false));
}

/**
 * The member's latest placement as stored, WITHOUT calling LeetCode (cheap
 * enough for any page load). If it timed out unnoticed, close it out here,
 * which needs only the stored log.
 */
export async function currentPlacement(memberId: number): Promise<PlacementView | null> {
  let row = await latest(memberId);
  if (!row) return null;
  const passed = await passedTiers(row);
  if (!row.finished_at && row.expired) {
    await finalize(row, passed);
    row = (await latest(memberId)) ?? row;
  }
  return view(row, passed);
}

/** Refresh an active placement, or report the last result. Null if they never started one. */
export async function pollPlacement(session: Session): Promise<PlacementView | null> {
  const { member } = session;
  let row = await latest(member.id);
  if (!row) return null;
  if (row.finished_at) return view(row, await passedTiers(row));

  const syncIssue = await trySync(member, 20);
  const passed = await passedTiers(row);
  if (row.expired) {
    await finalize(row, passed);
    row = (await latest(member.id)) ?? row;
    return view(row, passed, syncIssue);
  }
  return view(row, passed, syncIssue);
}

/** The member says they are done. Do one last refresh, then record the result. */
export async function finishPlacement(session: Session): Promise<PlacementView | null> {
  const { member } = session;
  let row = await latest(member.id);
  if (!row) return null;
  if (row.finished_at) return view(row, await passedTiers(row));

  const syncIssue = await trySync(member, 10);
  const passed = await passedTiers(row);
  await finalize(row, passed);
  row = (await latest(member.id)) ?? row;
  return view(row, passed, syncIssue);
}
