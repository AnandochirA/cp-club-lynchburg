/**
 * Tiny fetch wrapper for the browser. Every route answers `{ error: "code" }`
 * on failure; `apiErrors` in content.ts turns those codes into plain words.
 * Same-origin, so the httpOnly session cookie is sent automatically.
 */

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number; retryAt?: string };

/** The static preview build has no server, so anything that needs one is switched off. */
export const IS_PREVIEW = process.env.NEXT_PUBLIC_STATIC_PREVIEW === '1';

async function call<T>(method: string, path: string, body?: unknown): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: { 'content-type': 'application/json' },
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
    });
  } catch {
    return { ok: false, error: 'offline', status: 0 };
  }
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    /* an empty or non-JSON body is handled below */
  }
  const obj = (json && typeof json === 'object' ? json : {}) as Record<string, unknown>;
  if (res.ok) return { ok: true, data: json as T };
  return {
    ok: false,
    error: typeof obj.error === 'string' ? obj.error : 'server',
    status: res.status,
    retryAt: typeof obj.retryAt === 'string' ? obj.retryAt : undefined,
  };
}

export const apiGet = <T>(path: string) => call<T>('GET', path);
export const apiPost = <T>(path: string, body?: unknown) => call<T>('POST', path, body);
export const apiDelete = <T>(path: string) => call<T>('DELETE', path);
