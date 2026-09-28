import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { USERNAME_RE } from '@/lib/leetcode';
import { guardPost, readJson, str } from '@/lib/request';
import { hashToken, makeCode, randomToken } from '@/lib/verify-code';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Step 1 of proving you control a LeetCode account: get a one-time code to
 * paste into your LeetCode "About me". Also the way back in for a returning
 * member (a new device just repeats the same proof).
 *
 * This does NOT call LeetCode, so it cannot be used to hammer it. The code is
 * shown once here and stored only as a hash.
 */
export async function POST(req: Request) {
  const refused = guardPost(req);
  if (refused) return refused;

  const body = await readJson(req);
  if (!body) return NextResponse.json({ error: 'bad_request' }, { status: 400 });

  const username = str(body.username, 60);
  if (!USERNAME_RE.test(username)) return NextResponse.json({ error: 'bad_username' }, { status: 400 });
  const claim = str(body.claim, 200);

  try {
    const sql = db();

    // Cheap flood guard: a handful of fresh challenges per username is plenty.
    const recent = (await sql`
      select count(*)::int as n from link_challenges
      where lower(username) = lower(${username}) and created_at > now() - interval '10 minutes'
    `) as { n: number }[];
    if (recent[0].n >= 5) return NextResponse.json({ error: 'slow_down' }, { status: 429 });

    // A claim only ties this proof to the signup that just happened. A wrong
    // or expired one is ignored; it never blocks or grants anything.
    let claimHash: string | null = null;
    if (claim) {
      const hash = hashToken(claim);
      const ok = await sql`
        select 1 from signup_claims where token_hash = ${hash} and used_at is null and expires_at > now()
      `;
      if (ok.length > 0) claimHash = hash;
    }

    const id = randomToken(16);
    const code = makeCode();
    await sql`
      insert into link_challenges (id, username, code_hash, claim_hash, expires_at)
      values (${id}, ${username}, ${hashToken(code)}, ${claimHash}, now() + interval '15 minutes')
    `;
    return NextResponse.json({ challengeId: id, code, expiresInSeconds: 15 * 60 });
  } catch (err) {
    console.error('link failed', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
