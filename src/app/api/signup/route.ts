import { NextResponse } from 'next/server';
import { db, type SignupRow } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX = 200;
const clean = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, MAX) : '');
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

/** Add a member to the list. */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Expected JSON' }, { status: 400 });
  }

  const name = clean(body.name);
  const email = clean(body.email).toLowerCase();
  const experience = clean(body.experience);
  const classYear = clean(body.classYear) || null;
  const major = clean(body.major) || null;

  if (!name || !isEmail(email) || !experience) {
    return NextResponse.json(
      { error: 'Name, a valid email, and an experience level are required.' },
      { status: 400 },
    );
  }

  try {
    const sql = db();
    const rows = (await sql`
      insert into signups (name, email, class_year, major, experience, source)
      values (${name}, ${email}, ${classYear}, ${major}, ${experience}, 'website')
      on conflict (lower(email)) do nothing
      returning id
    `) as { id: number }[];

    // Already on the list: still a success for the person filling the form.
    return NextResponse.json({ ok: true, duplicate: rows.length === 0 }, { status: 201 });
  } catch (err) {
    console.error('signup failed', err);
    return NextResponse.json({ error: 'Could not save that right now.' }, { status: 500 });
  }
}

/** Read the list. Requires the admin token — never public. */
export async function GET(req: Request) {
  const token = process.env.ADMIN_TOKEN;
  const given =
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    new URL(req.url).searchParams.get('token');

  if (!token || token === 'change-me-to-something-long-and-random') {
    return NextResponse.json({ error: 'ADMIN_TOKEN is not set.' }, { status: 503 });
  }
  if (given !== token) {
    return NextResponse.json({ error: 'Not authorised.' }, { status: 401 });
  }

  try {
    const sql = db();
    const rows = (await sql`
      select id, name, email, class_year, major, experience, source, created_at
      from signups order by created_at desc limit 1000
    `) as SignupRow[];
    return NextResponse.json({ count: rows.length, signups: rows });
  } catch (err) {
    console.error('read failed', err);
    return NextResponse.json({ error: 'Could not read the list.' }, { status: 500 });
  }
}
