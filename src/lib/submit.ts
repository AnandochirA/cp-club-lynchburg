/**
 * Where a signup goes.
 *
 * On the deployed site it POSTs to /api/signup, which writes to Postgres.
 * The static preview build has no server of its own, so it writes to the
 * host page's document store when the host grants one. Both paths store the
 * same shape.
 */

export type Signup = {
  name: string;
  email: string;
  classYear: string;
  major: string;
  experience: string;
};

export type SubmitResult =
  | { ok: true; duplicate?: boolean }
  | { ok: false; reason: 'duplicate' | 'invalid' | 'offline' | 'server' | 'preview' };

type DocRef = { set(data: Record<string, unknown>): Promise<void> };
type Db = { doc(path: string): DocRef };
type Host = { use(name: string): Promise<unknown> };

const IS_PREVIEW = process.env.NEXT_PUBLIC_STATIC_PREVIEW === '1';

/** Document ids may not contain "/" or "."; an email survives base64url fine. */
function docId(email: string) {
  const b64 = btoa(unescape(encodeURIComponent(email)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hostDb(): Promise<Db | null> {
  if (typeof window === 'undefined') return null;
  const host = (window as unknown as { claude?: Host }).claude;
  if (!host?.use) return null;
  try {
    const db = (await host.use('db')) as Db | null;
    return db && typeof db.doc === 'function' ? db : null;
  } catch {
    return null;
  }
}

export async function submitSignup(data: Signup): Promise<SubmitResult> {
  if (!data.name.trim() || !data.email.trim() || !data.experience) {
    return { ok: false, reason: 'invalid' };
  }
  const email = data.email.trim().toLowerCase();

  if (IS_PREVIEW) {
    const db = await hostDb();
    if (!db) return { ok: false, reason: 'preview' };
    try {
      await db.doc(`signups/${docId(email)}`).set({
        name: data.name.trim(),
        email,
        classYear: data.classYear,
        major: data.major,
        experience: data.experience,
        source: 'preview',
        createdAt: new Date().toISOString(),
      });
      return { ok: true };
    } catch {
      return { ok: false, reason: 'server' };
    }
  }

  let res: Response;
  try {
    res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...data, email }),
    });
  } catch {
    return { ok: false, reason: 'offline' };
  }

  if (res.ok) {
    const body = (await res.json().catch(() => ({}))) as { duplicate?: boolean };
    return { ok: true, duplicate: body.duplicate };
  }
  if (res.status === 409) return { ok: false, reason: 'duplicate' };
  if (res.status === 400) return { ok: false, reason: 'invalid' };
  return { ok: false, reason: 'server' };
}
