import { NextResponse } from 'next/server';
import { adminDenied, checkAdminHeader } from '@/lib/admin';
import { deleteMessage } from '@/lib/chat';
import { db } from '@/lib/db';
import { isRankKey } from '@/lib/progress';
import { readJson, str } from '@/lib/request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/*
 * Officer moderation for the study rooms. Authorization: Bearer <ADMIN_TOKEN>
 * header only, same as /api/admin/members.
 *
 *   curl -H "Authorization: Bearer $ADMIN_TOKEN" https://SITE/api/admin/chat
 *   curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" -H "content-type: application/json" \
 *        -d '{"action":"delete","id":123}' https://SITE/api/admin/chat
 *
 * Actions: delete, mute, unmute.
 */

export async function GET(req: Request) {
  const denied = adminDenied(checkAdminHeader(req));
  if (denied) return denied;

  const url = new URL(req.url);
  const rank = url.searchParams.get('rank');
  if (rank !== null && !isRankKey(rank)) return NextResponse.json({ error: 'bad_rank' }, { status: 400 });
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 200) || 200, 1), 500);

  try {
    const sql = db();
    // A deleted row's body is already cleared in the database (a real
    // delete of the content, not just a hidden flag), so this shows the
    // same thing a member would see, plus who removed it and when.
    const rows = rank
      ? await sql`
          select c.id, c.rank, c.body, c.created_at, c.deleted_at, c.deleted_by,
                 m.leetcode_username as username, m.display_name
          from chat_messages c join members m on m.id = c.member_id
          where c.rank = ${rank}
          order by c.id desc limit ${limit}
        `
      : await sql`
          select c.id, c.rank, c.body, c.created_at, c.deleted_at, c.deleted_by,
                 m.leetcode_username as username, m.display_name
          from chat_messages c join members m on m.id = c.member_id
          order by c.id desc limit ${limit}
        `;
    return NextResponse.json({ count: rows.length, messages: rows });
  } catch (err) {
    console.error('admin chat list failed', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const denied = adminDenied(checkAdminHeader(req));
  if (denied) return denied;

  const body = await readJson(req);
  if (!body) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  const action = str(body.action, 40);

  try {
    const sql = db();

    if (action === 'delete') {
      const id = Number(body.id);
      if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'bad_id' }, { status: 400 });
      const removed = await deleteMessage(id, { admin: true });
      if (!removed) return NextResponse.json({ error: 'message_gone' }, { status: 404 });
      return NextResponse.json({ ok: true });
    }

    if (action === 'mute' || action === 'unmute') {
      const username = str(body.username, 60);
      if (!username) return NextResponse.json({ error: 'username_required' }, { status: 400 });
      const minutes = action === 'mute' ? Math.min(Math.max(Number(body.minutes) || 60 * 24, 1), 60 * 24 * 90) : 0;
      const rows =
        action === 'mute'
          ? await sql`
              update members set chat_muted_until = now() + (${minutes}::int * interval '1 minute')
              where lower(leetcode_username) = lower(${username})
              returning chat_muted_until
            `
          : await sql`
              update members set chat_muted_until = null
              where lower(leetcode_username) = lower(${username})
              returning chat_muted_until
            `;
      if (rows.length === 0) return NextResponse.json({ error: 'no_such_member' }, { status: 404 });
      return NextResponse.json({ ok: true, chatMutedUntil: rows[0].chat_muted_until });
    }

    return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
  } catch (err) {
    console.error('admin chat action failed', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
