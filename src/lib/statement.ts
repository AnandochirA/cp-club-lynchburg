import 'server-only';
import { db } from '@/lib/db';
import { fetchStatement } from '@/lib/leetcode';
import { sanitizeStatement, statementText } from '@/lib/statement-html';
import { guardedCall } from '@/lib/sync';

export type Statement = { html: string | null; paid: boolean };

/** Statements barely change; refetch after this long anyway. */
const FRESH_DAYS = 30;

/**
 * A problem's statement, from the shared cache or fetched from LeetCode now
 * (behind the same circuit breaker as every other LeetCode call). Null when
 * LeetCode has no such problem. Callers check the slug is on the ladder first.
 */
export async function statementFor(slug: string): Promise<Statement | null> {
  const sql = db();
  const rows = (await sql`
    select html, paid, fetched_at > now() - ${`${FRESH_DAYS} days`}::interval as fresh
    from problem_statements where slug = ${slug}
  `) as { html: string | null; paid: boolean; fresh: boolean }[];
  if (rows[0]?.fresh) return { html: rows[0].html, paid: rows[0].paid };
  try {
    const got = await guardedCall(() => fetchStatement(slug));
    if (!got) return null;
    const html = got.html ? sanitizeStatement(got.html) : null;
    await sql`
      insert into problem_statements (slug, html, paid) values (${slug}, ${html}, ${got.paid})
      on conflict (slug) do update set html = excluded.html, paid = excluded.paid, fetched_at = now()
    `;
    return { html, paid: got.paid };
  } catch (err) {
    // A stale copy beats nothing while LeetCode is unreachable.
    if (rows[0]) return { html: rows[0].html, paid: rows[0].paid };
    throw err;
  }
}

/** The cached statement as plain text, for the AI interviewer's brief. Never fetches. */
export async function cachedStatementText(slug: string): Promise<string | null> {
  const sql = db();
  const rows = (await sql`select html from problem_statements where slug = ${slug}`) as { html: string | null }[];
  return rows[0]?.html ? statementText(rows[0].html) : null;
}
