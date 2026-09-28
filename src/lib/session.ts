import 'server-only';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { hashToken, randomToken } from '@/lib/verify-code';
import type { RankKey } from '@/lib/curriculum';

const COOKIE = 'cp_session';
/** Non-sensitive companion cookie read by the header. See createSession. */
export const HINT_COOKIE = 'cp_in';
const DAYS = 30;

export type MemberRow = {
  id: number;
  leetcode_username: string;
  signup_id: number | null;
  display_name: string;
  hide_from_leaderboard: boolean;
  rank: RankKey;
  rank_source: string;
  status: string;
  last_lc_call_at: Date | string | null;
  last_synced_at: Date | string | null;
  last_seen_ts: Date | string | null;
  gap_possible: boolean;
  created_at: Date | string;
};

export type Session = { member: MemberRow; verifiedAt: Date };

/**
 * Start a session for a member. Only ever call this right after the LeetCode
 * code check succeeded: a session is proof of account ownership, never of an
 * email address. `verified_at` records that moment so sensitive steps (starting
 * a placement) can ask for a recent one.
 */
export async function createSession(memberId: number): Promise<void> {
  const token = randomToken();
  const sql = db();
  await sql`
    insert into sessions (token_hash, member_id, expires_at)
    values (${hashToken(token)}, ${memberId}, now() + ${`${DAYS} days`}::interval)
  `;
  const jar = await cookies();
  const base = {
    sameSite: 'lax' as const,
    // http://localhost has no TLS, so a secure-only cookie would never be sent in dev.
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: DAYS * 24 * 60 * 60,
  };
  jar.set(COOKIE, token, { ...base, httpOnly: true });
  // A readable "someone is signed in" hint so the header can say "My progress"
  // instead of "Sign in" without a network request. It carries no identity and
  // grants nothing; the real check is always the httpOnly cookie above.
  jar.set(HINT_COOKIE, '1', { ...base, httpOnly: false });
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const sql = db();
  const rows = (await sql`
    select m.*, s.verified_at as session_verified_at
    from sessions s join members m on m.id = s.member_id
    where s.token_hash = ${hashToken(token)} and s.expires_at > now()
  `) as (MemberRow & { session_verified_at: Date | string })[];
  if (rows.length === 0) return null;
  const { session_verified_at, ...member } = rows[0];
  return { member: member as MemberRow, verifiedAt: new Date(session_verified_at) };
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    const sql = db();
    await sql`delete from sessions where token_hash = ${hashToken(token)}`;
  }
  jar.delete(COOKIE);
  jar.delete(HINT_COOKIE);
}
