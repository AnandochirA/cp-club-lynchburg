import 'server-only';
import { looksLikeCode, normalize, MAX_LEN } from '@/lib/chat-rules';
import { club, rankName } from '@/lib/content';
import { RANK_KEYS, curriculum, type RankKey } from '@/lib/curriculum';
import { db } from '@/lib/db';
import { weeklyCounts, streakWeeks } from '@/lib/momentum';
import { rankIndex, rankProgress, totalSolved } from '@/lib/progress';
import type { Session } from '@/lib/session';
import { loadSolvedTimes } from '@/lib/sync';

const TOTAL_PROBLEMS = Object.values(curriculum).reduce((n, set) => n + set.length, 0);

/** A member reads and posts in a room once they have REACHED that rank — the
 * same gate the problem sets already use, so a room is never spoiled for
 * someone who has not climbed to it yet. */
export function canUseRoom(memberRank: RankKey, room: RankKey): boolean {
  return rankIndex(memberRank) >= rankIndex(room);
}

export class ChatError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(code);
  }
}

const MIN_SECONDS_BETWEEN = 3;

/** One conditional UPDATE, so it is safe across serverless instances that
 * share no memory — the same pattern `claimCall` uses for LeetCode calls,
 * kept as its own column so a chat burst never throttles a real sync. */
async function claimChatSend(memberId: number): Promise<boolean> {
  const sql = db();
  const rows = await sql`
    update members set last_chat_at = now()
    where id = ${memberId}
      and (last_chat_at is null or last_chat_at < now() - (${MIN_SECONDS_BETWEEN}::int * interval '1 second'))
    returning id
  `;
  return rows.length > 0;
}

export type MessageKind = 'message' | 'progress' | 'announcement';

export type ChatMessage = {
  id: number;
  /** null for an officer's announcement — nobody's message to delete or attribute. */
  memberId: number | null;
  displayName: string;
  /** The poster's current rank, for their avatar. Null for an announcement. */
  rank: RankKey | null;
  kind: MessageKind;
  /** A problem this message is about, chosen from the room's own set. */
  problemSlug: string | null;
  /** A 'progress' message's snapshot (numbers computed server-side at post time). */
  meta: Record<string, unknown> | null;
  createdAt: string;
  /** '' once deleted; the UI shows a tombstone instead. */
  body: string;
  deleted: boolean;
  deletedBy: 'author' | 'admin' | null;
  /** True if the requesting member wrote this one (theirs to delete). */
  mine: boolean;
};

type Row = {
  id: number | string;
  member_id: number | null;
  body: string;
  created_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
  kind: MessageKind;
  problem_slug: string | null;
  meta: unknown;
  display_name: string | null;
  rank: RankKey | null;
};

function present(rows: Row[], viewerId: number): ChatMessage[] {
  return rows.map((r) => ({
    id: Number(r.id),
    memberId: r.member_id,
    displayName: r.display_name ?? club.full,
    rank: r.rank,
    kind: r.kind,
    problemSlug: r.deleted_at ? null : r.problem_slug,
    meta: r.deleted_at ? null : ((r.meta as Record<string, unknown> | null) ?? null),
    createdAt: new Date(r.created_at).toISOString(),
    body: r.deleted_at ? '' : r.body,
    deleted: !!r.deleted_at,
    deletedBy: (r.deleted_by as 'author' | 'admin' | null) ?? null,
    mine: r.member_id !== null && r.member_id === viewerId,
  }));
}

/**
 * The room's messages around a cursor. Announcements are excluded — they are
 * pinned separately (see `listPinned`), never mixed into the scrolling feed.
 * - no cursor: the latest `limit`, oldest first (first load).
 * - `after`: everything newer than that id, oldest first (polling).
 * - `before`: the `limit` before that id, oldest first, plus whether there
 *   is more (loading older history upward).
 */
export async function listRoom(
  room: RankKey,
  viewerId: number,
  opts: { after?: number; before?: number; limit?: number } = {},
): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
  const sql = db();
  const limit = Math.min(Math.max(opts.limit ?? 40, 1), 200);

  if (opts.after !== undefined) {
    const rows = (await sql`
      select c.id, c.member_id, c.body, c.created_at, c.deleted_at, c.deleted_by,
             c.kind, c.problem_slug, c.meta, m.display_name, m.rank
      from chat_messages c left join members m on m.id = c.member_id
      where c.rank = ${room} and c.kind != 'announcement' and c.id > ${opts.after}
      order by c.id asc
      limit ${limit}
    `) as Row[];
    return { messages: present(rows, viewerId), hasMore: false };
  }

  if (opts.before !== undefined) {
    const rows = (await sql`
      select c.id, c.member_id, c.body, c.created_at, c.deleted_at, c.deleted_by,
             c.kind, c.problem_slug, c.meta, m.display_name, m.rank
      from chat_messages c left join members m on m.id = c.member_id
      where c.rank = ${room} and c.kind != 'announcement' and c.id < ${opts.before}
      order by c.id desc
      limit ${limit + 1}
    `) as Row[];
    const hasMore = rows.length > limit;
    return { messages: present(rows.slice(0, limit).reverse(), viewerId), hasMore };
  }

  const rows = (await sql`
    select c.id, c.member_id, c.body, c.created_at, c.deleted_at, c.deleted_by,
           c.kind, c.problem_slug, c.meta, m.display_name, m.rank
    from chat_messages c left join members m on m.id = c.member_id
    where c.rank = ${room} and c.kind != 'announcement'
    order by c.id desc
    limit ${limit + 1}
  `) as Row[];
  const hasMore = rows.length > limit;
  return { messages: present(rows.slice(0, limit).reverse(), viewerId), hasMore };
}

/** Up to 3 active announcements for a room, newest first — the pinned banner. */
export async function listPinned(room: RankKey): Promise<ChatMessage[]> {
  const sql = db();
  const rows = (await sql`
    select c.id, c.member_id, c.body, c.created_at, c.deleted_at, c.deleted_by,
           c.kind, c.problem_slug, c.meta, m.display_name, m.rank
    from chat_messages c left join members m on m.id = c.member_id
    where c.rank = ${room} and c.kind = 'announcement' and c.deleted_at is null
    order by c.id desc
    limit 3
  `) as Row[];
  return present(rows, -1);
}

/** A member's own progress, computed fresh (never taken from the client) and
 * frozen into the message — the same "snapshot, not a live query" approach
 * placements already use. */
async function progressSnapshot(
  member: Session['member'],
): Promise<{ caption: string; meta: Record<string, unknown> }> {
  const times = await loadSolvedTimes(member.id);
  const solved = new Set(times.map((t) => t.slug));
  const focus: RankKey =
    member.rank === 'ancient' && rankProgress('ancient', solved).remaining.length === 0 ? 'divine' : member.rank;
  const progress = rankProgress(focus, solved);
  const now = Date.now();
  const tsList = times.map((t) => t.ts);
  const weekCount = weeklyCounts(tsList, now, 1)[0]?.count ?? 0;
  const quota = focus === 'divine' ? 3 : 10;
  const streak = streakWeeks(tsList, now);
  const rn = rankName(focus);

  const bits = [`${progress.solved}/${progress.total} solved in ${rn}`];
  if (streak > 0) bits.push(`${streak}-week streak`);
  bits.push(`${weekCount}/${quota} this week`);

  return {
    caption: bits.join(' · '),
    meta: {
      rank: focus,
      rankName: rn,
      solved: progress.solved,
      total: progress.total,
      totalSolved: totalSolved(solved),
      totalProblems: TOTAL_PROBLEMS,
      weekCount,
      quota,
      streak,
    },
  };
}

export type PostInput = {
  kind?: 'message' | 'progress';
  body?: string;
  /** Only meaningful for kind 'message': a problem from this room's own set. */
  problemSlug?: string;
};

export async function postToRoom(session: Session, room: RankKey, input: PostInput): Promise<ChatMessage> {
  const member = session.member;
  if (!canUseRoom(member.rank, room)) throw new ChatError('locked', 403);

  if (member.chat_muted_until && new Date(member.chat_muted_until).getTime() > Date.now()) {
    throw new ChatError('muted', 403);
  }

  const kind: 'message' | 'progress' = input.kind === 'progress' ? 'progress' : 'message';
  let body: string;
  let problemSlug: string | null = null;
  let meta: Record<string, unknown> | null = null;

  if (kind === 'progress') {
    const snap = await progressSnapshot(member);
    body = snap.caption;
    meta = snap.meta;
  } else {
    body = normalize(input.body ?? '');
    if (body === '') throw new ChatError('empty', 400);
    if (body.length > MAX_LEN) throw new ChatError('too_long', 400);
    if (looksLikeCode(body)) throw new ChatError('looks_like_code', 400);
    if (input.problemSlug) {
      if (!curriculum[room].some((p) => p.slug === input.problemSlug)) throw new ChatError('bad_problem', 400);
      problemSlug = input.problemSlug;
    }
  }

  if (!(await claimChatSend(member.id))) throw new ChatError('chat_too_fast', 429);

  const sql = db();
  const rows = (await sql`
    insert into chat_messages (rank, member_id, body, kind, problem_slug, meta)
    values (${room}, ${member.id}, ${body}, ${kind}, ${problemSlug}, ${meta ? JSON.stringify(meta) : null}::jsonb)
    returning id, member_id, body, created_at, deleted_at, deleted_by, kind, problem_slug, meta
  `) as Omit<Row, 'display_name' | 'rank'>[];
  const r = rows[0];
  return present([{ ...r, display_name: member.display_name, rank: member.rank }], member.id)[0];
}

/** Officers only (see /api/admin/chat). No member behind it, so it is never
 * throttled and never someone's to self-delete — only an officer can remove
 * it, the same as any other message via `deleteMessage`. */
export async function postAnnouncement(room: RankKey, raw: string): Promise<ChatMessage> {
  const body = normalize(raw);
  if (body === '') throw new ChatError('empty', 400);
  if (body.length > MAX_LEN) throw new ChatError('too_long', 400);

  const sql = db();
  const rows = (await sql`
    insert into chat_messages (rank, member_id, body, kind)
    values (${room}, null, ${body}, 'announcement')
    returning id, member_id, body, created_at, deleted_at, deleted_by, kind, problem_slug, meta
  `) as Omit<Row, 'display_name' | 'rank'>[];
  const r = rows[0];
  return present([{ ...r, display_name: null, rank: null }], -1)[0];
}

/** The author (any time) or an officer can remove a message. It stays as a
 * tombstone: a message someone already replied to should not vanish, only
 * go quiet, and everyone polling keeps a stable list of ids. */
export async function deleteMessage(id: number, by: { memberId: number } | { admin: true }): Promise<boolean> {
  const sql = db();
  if ('admin' in by) {
    const rows = await sql`
      update chat_messages set body = '', problem_slug = null, meta = null, deleted_at = now(), deleted_by = 'admin'
      where id = ${id} and deleted_at is null
      returning id
    `;
    return rows.length > 0;
  }
  const rows = await sql`
    update chat_messages set body = '', problem_slug = null, meta = null, deleted_at = now(), deleted_by = 'author'
    where id = ${id} and member_id = ${by.memberId} and deleted_at is null
    returning id
  `;
  return rows.length > 0;
}

export type RoomSummary = {
  rank: RankKey;
  unlocked: boolean;
  messageCount: number;
  last: { displayName: string; body: string; createdAt: string; deleted: boolean; kind: MessageKind } | null;
};

/** One row per rank, for the rooms index and the dashboard teaser. Locked
 * rooms carry no content at all — not even a count — so nothing about a
 * room a member has not reached leaks through the preview. Announcements are
 * excluded (they are pinned once you are in the room, not part of the count
 * or the "last activity" preview). */
export async function roomsOverview(memberRank: RankKey): Promise<RoomSummary[]> {
  const sql = db();
  const unlockedRooms = RANK_KEYS.filter((r) => canUseRoom(memberRank, r));
  if (unlockedRooms.length === 0) return RANK_KEYS.map((rank) => ({ rank, unlocked: false, messageCount: 0, last: null }));

  const rows = (await sql`
    select rank, count(*)::int as n,
      (array_agg(body order by id desc))[1] as last_body,
      (array_agg(deleted_at order by id desc))[1] as last_deleted_at,
      (array_agg(created_at order by id desc))[1] as last_created_at,
      (array_agg(display_name order by id desc))[1] as last_name,
      (array_agg(kind order by id desc))[1] as last_kind
    from (
      select c.rank, c.body, c.deleted_at, c.created_at, coalesce(m.display_name, ${club.full}) as display_name, c.id, c.kind
      from chat_messages c left join members m on m.id = c.member_id
      where c.rank = any(${unlockedRooms}) and c.kind != 'announcement'
    ) x
    group by rank
  `) as {
    rank: RankKey;
    n: number;
    last_body: string;
    last_deleted_at: string | null;
    last_created_at: string;
    last_name: string;
    last_kind: MessageKind;
  }[];
  const byRank = new Map(rows.map((r) => [r.rank, r]));

  return RANK_KEYS.map((rank) => {
    const unlocked = canUseRoom(memberRank, rank);
    if (!unlocked) return { rank, unlocked, messageCount: 0, last: null };
    const r = byRank.get(rank);
    if (!r) return { rank, unlocked, messageCount: 0, last: null };
    return {
      rank,
      unlocked,
      messageCount: r.n,
      last: {
        displayName: r.last_name,
        body: r.last_deleted_at ? '' : r.last_body,
        createdAt: r.last_created_at,
        deleted: !!r.last_deleted_at,
        kind: r.last_kind,
      },
    };
  });
}
