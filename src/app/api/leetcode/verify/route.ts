import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { LeetCodeError, fetchProfile } from '@/lib/leetcode';
import { guardPost, readJson, str } from '@/lib/request';
import { createSession } from '@/lib/session';
import { guardedCall } from '@/lib/sync';
import { aboutMeHasCode, hashToken } from '@/lib/verify-code';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_ATTEMPTS = 5;

type Challenge = { id: string; username: string; code_hash: string; claim_hash: string | null };

/**
 * Step 2: read the account's public About me and look for OUR code in it.
 * Only the caller's own challenge is ever compared (we never search by code:
 * it sits in a public profile). On success the account becomes a member and
 * a session starts. That session is the only way in: never an email.
 */
export async function POST(req: Request) {
  const refused = guardPost(req);
  if (refused) return refused;

  const body = await readJson(req);
  const challengeId = str(body?.challengeId, 100);
  if (!challengeId) return NextResponse.json({ error: 'bad_request' }, { status: 400 });

  try {
    const sql = db();

    // Count the attempt BEFORE calling LeetCode, atomically, so parallel
    // requests cannot get more than MAX_ATTEMPTS calls out of one challenge.
    const claimed = (await sql`
      update link_challenges set attempts = attempts + 1
      where id = ${challengeId} and used_at is null and expires_at > now() and attempts < ${MAX_ATTEMPTS}
      returning id, username, code_hash, claim_hash
    `) as Challenge[];
    if (claimed.length === 0) {
      const known = (await sql`
        select attempts, (expires_at > now() and used_at is null) as live from link_challenges where id = ${challengeId}
      `) as { attempts: number; live: boolean }[];
      if (known.length > 0 && known[0].live && known[0].attempts >= MAX_ATTEMPTS) {
        return NextResponse.json({ error: 'too_many_attempts' }, { status: 429 });
      }
      return NextResponse.json({ error: 'expired' }, { status: 410 });
    }
    const challenge = claimed[0];
    const refund = () => sql`update link_challenges set attempts = attempts - 1 where id = ${challenge.id}`;

    let profile;
    try {
      profile = await guardedCall(() => fetchProfile(challenge.username));
    } catch (err) {
      // LeetCode being down is not the member's fault: give the attempt back.
      await refund();
      if (err instanceof LeetCodeError) return NextResponse.json({ error: 'leetcode_unavailable' }, { status: 503 });
      throw err;
    }

    if (!profile) return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
    if (!aboutMeHasCode(profile.aboutMe, challenge.code_hash)) {
      return NextResponse.json({ error: 'code_not_found' }, { status: 422 });
    }

    // Burn the challenge. If two requests race, only one gets a row back.
    const used = await sql`
      update link_challenges set used_at = now() where id = ${challenge.id} and used_at is null returning id
    `;
    if (used.length === 0) return NextResponse.json({ error: 'already_used' }, { status: 409 });

    // Create the member, or find the existing one (a returning member signing
    // in again). The unique index on lower(username) settles any race.
    const rows = (await sql`
      insert into members (leetcode_username, display_name)
      values (${profile.username}, ${profile.username})
      on conflict (lower(leetcode_username)) do update set status = 'ok'
      returning id, rank, signup_id, (xmax = 0) as is_new
    `) as { id: number; rank: string; signup_id: number | null; is_new: boolean }[];
    const member = rows[0];

    // Tie this account to the signup that just happened, if it still can be.
    if (challenge.claim_hash && member.signup_id === null) {
      const claim = (await sql`
        update signup_claims set used_at = now()
        where token_hash = ${challenge.claim_hash} and used_at is null and expires_at > now()
        returning signup_id
      `) as { signup_id: number }[];
      if (claim.length > 0) {
        try {
          await sql`update members set signup_id = ${claim[0].signup_id} where id = ${member.id} and signup_id is null`;
        } catch {
          /* that signup already belongs to another member; leave it */
        }
      }
    }

    await createSession(member.id);
    return NextResponse.json({
      ok: true,
      isNew: member.is_new,
      member: { username: profile.username, rank: member.rank },
    });
  } catch (err) {
    console.error('verify failed', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
