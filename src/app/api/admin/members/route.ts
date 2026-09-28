import { NextResponse } from 'next/server';
import { adminDenied, checkAdminHeader } from '@/lib/admin';
import { curriculum } from '@/lib/curriculum';
import { db } from '@/lib/db';
import { isRankKey } from '@/lib/progress';
import { readJson, str } from '@/lib/request';
import { promoteIfComplete } from '@/lib/sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/*
 * Officer tools. Authorization: Bearer <ADMIN_TOKEN> header ONLY: these change
 * data, and a ?token= query string leaks into logs and Referer headers.
 *
 *   curl -H "Authorization: Bearer $ADMIN_TOKEN" https://SITE/api/admin/members
 *   curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" -H "content-type: application/json" \
 *        -d '{"action":"set_rank","username":"someone","rank":"legend"}' https://SITE/api/admin/members
 *
 * Actions: set_rank, grant_solve, revoke_solve, link_signup, delete.
 */

const SLUG_RE = /^[a-z0-9-]{1,100}$/;
const ALL_SLUGS = new Set(Object.values(curriculum).flatMap((set) => set.map((p) => p.slug)));

export async function GET(req: Request) {
  const denied = adminDenied(checkAdminHeader(req));
  if (denied) return denied;
  try {
    const sql = db();
    const rows = await sql`
      select m.leetcode_username as username, m.rank, m.rank_source, m.status, m.gap_possible,
             m.last_synced_at, m.created_at, m.signup_id is not null as has_signup,
             (select count(distinct e.slug)::int from ac_events e
                where e.member_id = m.id and e.revoked_at is null and e.ts >= m.created_at) as solved,
             (select p.result_rank from placements p where p.member_id = m.id
                order by p.started_at desc limit 1) as placement_rank,
             (select p.flagged from placements p where p.member_id = m.id
                order by p.started_at desc limit 1) as placement_flagged
      from members m order by m.created_at desc limit 500
    `;
    return NextResponse.json({ count: rows.length, members: rows });
  } catch (err) {
    console.error('admin list failed', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const denied = adminDenied(checkAdminHeader(req));
  if (denied) return denied;

  const body = await readJson(req);
  if (!body) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  const action = str(body.action, 40);
  const username = str(body.username, 60);
  if (!username) return NextResponse.json({ error: 'username_required' }, { status: 400 });

  try {
    const sql = db();
    const found = (await sql`
      select id, rank from members where lower(leetcode_username) = lower(${username})
    `) as { id: number; rank: string }[];
    if (found.length === 0) return NextResponse.json({ error: 'no_such_member' }, { status: 404 });
    const member = found[0];

    if (action === 'set_rank') {
      const rank = str(body.rank, 20);
      if (!isRankKey(rank)) return NextResponse.json({ error: 'bad_rank' }, { status: 400 });
      await sql`update members set rank = ${rank}, rank_source = 'admin' where id = ${member.id}`;
      await sql`
        insert into rank_history (member_id, from_rank, to_rank, actor)
        values (${member.id}, ${member.rank}, ${rank}, 'admin')
      `;
      return NextResponse.json({ ok: true, rank });
    }

    if (action === 'grant_solve' || action === 'revoke_solve') {
      const slug = str(body.slug, 100);
      if (!SLUG_RE.test(slug)) return NextResponse.json({ error: 'bad_slug' }, { status: 400 });
      if (!ALL_SLUGS.has(slug)) return NextResponse.json({ error: 'not_in_curriculum' }, { status: 400 });
      if (action === 'grant_solve') {
        await sql`
          insert into ac_events (member_id, slug, ts, source) values (${member.id}, ${slug}, now(), 'admin')
        `;
        // A granted solve can complete a rank's set, so promote if it did.
        return NextResponse.json({ ok: true, promoted: await promoteIfComplete(member.id) });
      } else {
        // A tombstone, not a delete: the next sync must not quietly bring it back.
        await sql`
          update ac_events set revoked_at = now()
          where member_id = ${member.id} and slug = ${slug} and revoked_at is null
        `;
      }
      return NextResponse.json({ ok: true });
    }

    if (action === 'link_signup') {
      const email = str(body.email, 200).toLowerCase();
      if (!email) return NextResponse.json({ error: 'email_required' }, { status: 400 });
      const signup = (await sql`select id from signups where lower(email) = ${email}`) as { id: number }[];
      if (signup.length === 0) return NextResponse.json({ error: 'no_such_signup' }, { status: 404 });
      try {
        await sql`update members set signup_id = ${signup[0].id} where id = ${member.id}`;
      } catch {
        return NextResponse.json({ error: 'signup_already_linked' }, { status: 409 });
      }
      return NextResponse.json({ ok: true });
    }

    if (action === 'delete') {
      await sql`delete from members where id = ${member.id}`;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
  } catch (err) {
    console.error('admin action failed', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
