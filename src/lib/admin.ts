import { createHash, timingSafeEqual } from 'node:crypto';

const PLACEHOLDER = 'change-me-to-something-long-and-random';

export type AdminCheck = 'ok' | 'unset' | 'bad';

/**
 * Constant-time check of a presented admin token against ADMIN_TOKEN.
 * Both sides are hashed first so the comparison is the same length whatever
 * was sent.
 */
export function checkAdminToken(given: string | null | undefined): AdminCheck {
  const token = process.env.ADMIN_TOKEN;
  if (!token || token === PLACEHOLDER) return 'unset';
  if (!given) return 'bad';
  const a = createHash('sha256').update(token).digest();
  const b = createHash('sha256').update(given).digest();
  return timingSafeEqual(a, b) ? 'ok' : 'bad';
}

/**
 * For anything that CHANGES data: the token must come in the Authorization
 * header. (A ?token= query string ends up in logs and Referer headers, which
 * is tolerable for reading a list but not for a write.)
 */
export function checkAdminHeader(req: Request): AdminCheck {
  const header = req.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return checkAdminToken(match ? match[1] : null);
}

export function adminDenied(check: AdminCheck): Response | null {
  if (check === 'ok') return null;
  return Response.json(
    { error: check === 'unset' ? 'ADMIN_TOKEN is not set.' : 'Not authorised.' },
    { status: check === 'unset' ? 503 : 401 },
  );
}
