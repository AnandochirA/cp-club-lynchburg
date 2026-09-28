import { checkAdminToken } from '@/lib/admin';
import { db, type SignupRow } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Signups', robots: { index: false, follow: false } };

/**
 * Who has joined. Open /admin?token=<ADMIN_TOKEN>.
 * Deliberately plain — it exists to be read and exported, not admired.
 */
export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const check = checkAdminToken(token);

  if (check === 'unset') {
    return <Shell>Set <code>ADMIN_TOKEN</code> in your environment first.</Shell>;
  }
  if (check === 'bad') {
    return <Shell>Add <code>?token=…</code> to this URL to see the list.</Shell>;
  }

  let rows: SignupRow[] = [];
  let error: string | null = null;
  try {
    const sql = db();
    rows = (await sql`
      select id, name, email, class_year, major, experience, source, created_at
      from signups order by created_at desc limit 1000
    `) as SignupRow[];
  } catch (e) {
    error = e instanceof Error ? e.message : 'Could not reach the database.';
  }

  if (error) return <Shell>{error}</Shell>;

  return (
    <main className="mx-auto max-w-5xl px-6 py-12 font-sans">
      <h1 className="font-display m-0 text-3xl font-extrabold">
        Signups <span className="text-muted">({rows.length})</span>
      </h1>
      {rows.length === 0 ? (
        <p className="mt-4 text-muted">Nobody has signed up yet.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="font-mono text-xs uppercase text-dim">
              <tr>
                {['Name', 'Email', 'Year', 'Major', 'Experience', 'Joined'].map((h) => (
                  <th key={h} className="border-b border-line py-2.5 pr-4 font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line/60">
                  <td className="py-2.5 pr-4 font-medium">{r.name}</td>
                  <td className="py-2.5 pr-4 text-muted">{r.email}</td>
                  <td className="py-2.5 pr-4 text-muted">{r.class_year ?? '—'}</td>
                  <td className="py-2.5 pr-4 text-muted">{r.major ?? '—'}</td>
                  <td className="py-2.5 pr-4 text-muted">{r.experience}</td>
                  <td className="font-mono py-2.5 pr-4 text-xs text-dim">
                    {new Date(r.created_at).toISOString().slice(0, 16).replace('T', ' ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="font-mono mt-8 text-xs text-dim">
        JSON: <code>/api/signup?token=…</code> returns the same rows. Members and rank tools:{' '}
        <code>/api/admin/members</code> (Authorization: Bearer header).
      </p>
    </main>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-xl px-6 py-24 font-sans text-muted">
      <h1 className="font-display m-0 text-2xl font-bold text-text">Signups</h1>
      <p className="mt-3">{children}</p>
    </main>
  );
}
