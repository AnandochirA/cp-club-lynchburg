import { NextResponse } from 'next/server';
import { checkAdminToken } from '@/lib/admin';
import { db, type SignupRow } from '@/lib/db';
import { hashToken, randomToken } from '@/lib/verify-code';

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
    if (rows.length === 0) return NextResponse.json({ ok: true, duplicate: true }, { status: 201 });

    // A brand-new signup gets a one-time claim, so the LeetCode account they
    // link next can be tied to this row. It is random, stored only as a hash,
    // single use and expires in an hour. Duplicates never get one (that would
    // let anyone type someone else's email and claim their record).
    // This must NEVER stop a signup from succeeding, so it is best-effort: if
    // the members tables have not been created yet, the signup still works.
    let claim: string | undefined;
    try {
      const token = randomToken();
      await sql`
        insert into signup_claims (token_hash, signup_id, expires_at)
        values (${hashToken(token)}, ${rows[0].id}, now() + interval '1 hour')
      `;
      claim = token;
    } catch (err) {
      console.error('claim not created', err);
    }
    return NextResponse.json({ ok: true, duplicate: false, claim }, { status: 201 });
  } catch (err) {
    console.error('signup failed', err);
    return NextResponse.json({ error: 'Could not save that right now.' }, { status: 500 });
  }
}

/** Read the list. Requires the admin token — never public. */
export async function GET(req: Request) {
  const given =
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    new URL(req.url).searchParams.get('token');

  const check = checkAdminToken(given);
  if (check === 'unset') return NextResponse.json({ error: 'ADMIN_TOKEN is not set.' }, { status: 503 });
  if (check === 'bad') return NextResponse.json({ error: 'Not authorised.' }, { status: 401 });

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
