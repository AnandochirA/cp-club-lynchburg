import 'server-only';
import { looksLikeCode, normalize, MAX_LEN } from '@/lib/chat-rules';
import { RANK_KEYS, type RankKey } from '@/lib/curriculum';
import { db } from '@/lib/db';
import { rankIndex } from '@/lib/progress';
import type { Session } from '@/lib/session';

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

export type ChatMessage = {
  id: number;
  memberId: number;
  displayName: string;
  rank: RankKey;
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
  member_id: number;
  body: string;
  created_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
  display_name: string;
  rank: RankKey;
};

function present(rows: Row[], viewerId: number): ChatMessage[] {
  return rows.map((r) => ({
    id: Number(r.id),
    memberId: r.member_id,
    displayName: r.display_name,
    rank: r.rank,
    createdAt: new Date(r.created_at).toISOString(),
    body: r.deleted_at ? '' : r.body,
    deleted: !!r.deleted_at,
    deletedBy: (r.deleted_by as 'author' | 'admin' | null) ?? null,
    mine: r.member_id === viewerId,
  }));
}

/**
 * The room's messages around a cursor.
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
             m.display_name, m.rank
      from chat_messages c join members m on m.id = c.member_id
      where c.rank = ${room} and c.id > ${opts.after}
      order by c.id asc
      limit ${limit}
    `) as Row[];
    return { messages: present(rows, viewerId), hasMore: false };
  }

  if (opts.before !== undefined) {
    const rows = (await sql`
      select c.id, c.member_id, c.body, c.created_at, c.deleted_at, c.deleted_by,
             m.display_name, m.rank
      from chat_messages c join members m on m.id = c.member_id
      where c.rank = ${room} and c.id < ${opts.before}
      order by c.id desc
      limit ${limit + 1}
    `) as Row[];
    const hasMore = rows.length > limit;
    return { messages: present(rows.slice(0, limit).reverse(), viewerId), hasMore };
  }

  const rows = (await sql`
    select c.id, c.member_id, c.body, c.created_at, c.deleted_at, c.deleted_by,
           m.display_name, m.rank
    from chat_messages c join members m on m.id = c.member_id
    where c.rank = ${room}
    order by c.id desc
    limit ${limit + 1}
  `) as Row[];
  const hasMore = rows.length > limit;
  return { messages: present(rows.slice(0, limit).reverse(), viewerId), hasMore };
}

export async function postToRoom(session: Session, room: RankKey, raw: string): Promise<ChatMessage> {
  const member = session.member;
  if (!canUseRoom(member.rank, room)) throw new ChatError('locked', 403);

  if (member.chat_muted_until && new Date(member.chat_muted_until).getTime() > Date.now()) {
    throw new ChatError('muted', 403);
  }

  const body = normalize(raw);
  if (body === '') throw new ChatError('empty', 400);
  if (body.length > MAX_LEN) throw new ChatError('too_long', 400);
  if (looksLikeCode(body)) throw new ChatError('looks_like_code', 400);

  if (!(await claimChatSend(member.id))) throw new ChatError('chat_too_fast', 429);

  const sql = db();
  const rows = (await sql`
    insert into chat_messages (rank, member_id, body) values (${room}, ${member.id}, ${body})
    returning id, member_id, body, created_at, deleted_at, deleted_by
  `) as Omit<Row, 'display_name' | 'rank'>[];
  const r = rows[0];
  return present([{ ...r, display_name: member.display_name, rank: member.rank }], member.id)[0];
}

/** The author (any time) or an officer can remove a message. It stays as a
 * tombstone: a message someone already replied to should not vanish, only
 * go quiet, and everyone polling keeps a stable list of ids. */
export async function deleteMessage(id: number, by: { memberId: number } | { admin: true }): Promise<boolean> {
  const sql = db();
  if ('admin' in by) {
    const rows = await sql`
      update chat_messages set body = '', deleted_at = now(), deleted_by = 'admin'
      where id = ${id} and deleted_at is null
      returning id
    `;
    return rows.length > 0;
  }
  const rows = await sql`
    update chat_messages set body = '', deleted_at = now(), deleted_by = 'author'
    where id = ${id} and member_id = ${by.memberId} and deleted_at is null
    returning id
  `;
  return rows.length > 0;
}

export type RoomSummary = {
  rank: RankKey;
  unlocked: boolean;
  messageCount: number;
  last: { displayName: string; body: string; createdAt: string; deleted: boolean } | null;
};

/** One row per rank, for the rooms index and the dashboard teaser. Locked
 * rooms carry no content at all — not even a count — so nothing about a
 * room a member has not reached leaks through the preview. */
export async function roomsOverview(memberRank: RankKey): Promise<RoomSummary[]> {
  const sql = db();
  const unlockedRooms = RANK_KEYS.filter((r) => canUseRoom(memberRank, r));
  if (unlockedRooms.length === 0) return RANK_KEYS.map((rank) => ({ rank, unlocked: false, messageCount: 0, last: null }));

  const rows = (await sql`
    select rank, count(*)::int as n,
      (array_agg(body order by id desc))[1] as last_body,
      (array_agg(deleted_at order by id desc))[1] as last_deleted_at,
      (array_agg(created_at order by id desc))[1] as last_created_at,
      (array_agg(display_name order by id desc))[1] as last_name
    from (
      select c.rank, c.body, c.deleted_at, c.created_at, m.display_name, c.id
      from chat_messages c join members m on m.id = c.member_id
      where c.rank = any(${unlockedRooms})
    ) x
    group by rank
  `) as { rank: RankKey; n: number; last_body: string; last_deleted_at: string | null; last_created_at: string; last_name: string }[];
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
      last: { displayName: r.last_name, body: r.last_deleted_at ? '' : r.last_body, createdAt: r.last_created_at, deleted: !!r.last_deleted_at },
    };
  });
}
