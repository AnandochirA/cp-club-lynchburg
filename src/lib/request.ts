import { NextResponse } from 'next/server';

/**
 * Guards for cookie-authenticated POST routes.
 *
 * SameSite=Lax already stops other sites from POSTing with our cookie. This is
 * defence in depth: if the browser says where the request came from and it is
 * not us, refuse; and only accept JSON (a cross-site <form> cannot send it).
 */
export function guardPost(req: Request): NextResponse | null {
  const origin = req.headers.get('origin');
  if (origin) {
    const hosts = [req.headers.get('host'), req.headers.get('x-forwarded-host')].filter(Boolean);
    let originHost = '';
    try {
      originHost = new URL(origin).host;
    } catch {
      /* fall through: an unparseable Origin is refused below */
    }
    if (!originHost || !hosts.includes(originHost)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  }
  const type = req.headers.get('content-type') ?? '';
  if (!type.toLowerCase().startsWith('application/json')) {
    return NextResponse.json({ error: 'expected_json' }, { status: 415 });
  }
  return null;
}

/** Parse a JSON object body, or null if it is missing or not an object. */
export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
