/**
 * The ONLY module that talks to LeetCode. Everything else goes through here so
 * the integration can be swapped or switched off in one place.
 *
 * It uses LeetCode's public, unofficial GraphQL endpoint, unauthenticated:
 *   - matchedUser.profile.aboutMe        (proves who controls an account)
 *   - recentAcSubmissionList             (latest Accepted submissions, capped at 20)
 * Neither needs a login. Because it is unofficial it can change or refuse us,
 * so failures are typed (`LeetCodeError`) and callers never treat a failure as
 * "zero solves".
 *
 * `LEETCODE_GRAPHQL_URL` overrides the endpoint. It exists for local tests
 * against a mock server; leave it unset in production.
 */

export type AcSubmission = {
  slug: string;
  title: string;
  /** Epoch SECONDS, as LeetCode reports it. Multiply by 1000 for a JS Date. */
  ts: number;
};

export type LeetCodeErrorKind = 'blocked' | 'network' | 'bad_response';

export class LeetCodeError extends Error {
  constructor(
    public kind: LeetCodeErrorKind,
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = 'LeetCodeError';
  }
}

export const USERNAME_RE = /^[A-Za-z0-9_-]{1,40}$/;

/** LeetCode never returns more than this many recent submissions. */
export const RECENT_AC_CAP = 20;

const endpoint = () => process.env.LEETCODE_GRAPHQL_URL || 'https://leetcode.com/graphql';

type GqlResult<T> = { data?: T; errors?: { message: string }[] };

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<GqlResult<T>> {
  let res: Response;
  try {
    res = await fetch(endpoint(), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        referer: 'https://leetcode.com',
        'user-agent': 'cp-club-lynchburg/1.0 (student club progress sync)',
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
  } catch (err) {
    throw new LeetCodeError('network', err instanceof Error ? err.message : 'request failed');
  }
  if (res.status === 403 || res.status === 429) {
    throw new LeetCodeError('blocked', `LeetCode refused the request (${res.status})`, res.status);
  }
  if (!res.ok) throw new LeetCodeError('network', `LeetCode HTTP ${res.status}`, res.status);
  try {
    return (await res.json()) as GqlResult<T>;
  } catch {
    throw new LeetCodeError('bad_response', 'LeetCode returned something that is not JSON');
  }
}

/**
 * One tiny, member-free request, for measuring whether LeetCode answers a given
 * host (the M0 feasibility check). Reports the HTTP status instead of throwing.
 */
export async function probe(): Promise<{ ok: boolean; status: number | null; ms: number }> {
  const t0 = Date.now();
  try {
    const res = await fetch(endpoint(), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        referer: 'https://leetcode.com',
        'user-agent': 'cp-club-lynchburg/1.0 (student club progress sync)',
      },
      body: JSON.stringify({ query: 'query{question(titleSlug:"two-sum"){questionFrontendId}}' }),
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    return { ok: res.ok, status: res.status, ms: Date.now() - t0 };
  } catch {
    return { ok: false, status: null, ms: Date.now() - t0 };
  }
}

/** The account's canonical username and About me text, or null if there is no such account. */
export async function fetchProfile(
  username: string,
): Promise<{ username: string; aboutMe: string } | null> {
  const out = await gql<{ matchedUser: { username: string; profile: { aboutMe: string | null } } | null }>(
    'query($u:String!){matchedUser(username:$u){username profile{aboutMe}}}',
    { u: username },
  );
  const user = out.data?.matchedUser;
  if (user) return { username: user.username, aboutMe: user.profile?.aboutMe ?? '' };
  // matchedUser is null with a "does not exist" error for an unknown account.
  // Anything else null-ish is a real problem, not "no such user".
  if (out.errors?.length && !out.errors.some((e) => /does not exist/i.test(e.message))) {
    throw new LeetCodeError('bad_response', out.errors[0].message);
  }
  return null;
}

/**
 * A problem's statement, as LeetCode's HTML. Only the statement: no hints and
 * no topic tags, which would give a blind round away. Premium problems come
 * back with no content.
 */
export async function fetchStatement(slug: string): Promise<{ html: string | null; paid: boolean } | null> {
  const out = await gql<{ question: { content: string | null; isPaidOnly: boolean } | null }>(
    'query($s:String!){question(titleSlug:$s){content isPaidOnly}}',
    { s: slug },
  );
  if (out.errors?.length && !out.data?.question) throw new LeetCodeError('bad_response', out.errors[0].message);
  const q = out.data?.question;
  if (!q) return null;
  return { html: q.content ?? null, paid: !!q.isPaidOnly };
}

/**
 * The latest Accepted submissions (at most 20), newest first. Note: an unknown
 * account returns [] here rather than an error, so an empty list does NOT prove
 * the account exists. Callers that care must check `fetchProfile`.
 */
export async function fetchRecentAc(username: string): Promise<AcSubmission[]> {
  const out = await gql<{
    recentAcSubmissionList: { title: string; titleSlug: string; timestamp: string }[] | null;
  }>(
    'query($u:String!,$l:Int){recentAcSubmissionList(username:$u,limit:$l){title titleSlug timestamp}}',
    { u: username, l: RECENT_AC_CAP },
  );
  const rows = out.data?.recentAcSubmissionList;
  if (!Array.isArray(rows)) throw new LeetCodeError('bad_response', 'No submission list in the response');
  const parsed: AcSubmission[] = [];
  for (const r of rows) {
    const ts = Number(r.timestamp);
    if (typeof r.titleSlug !== 'string' || !Number.isFinite(ts)) {
      throw new LeetCodeError('bad_response', 'Unexpected submission shape');
    }
    parsed.push({ slug: r.titleSlug, title: r.title, ts });
  }
  return parsed;
}
