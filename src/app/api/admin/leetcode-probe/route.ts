import { NextResponse } from 'next/server';
import { adminDenied, checkAdminHeader } from '@/lib/admin';
import { probe } from '@/lib/leetcode';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * M0 feasibility check: can THIS host (Vercel, Render, ...) reach LeetCode?
 * Datacenter IPs are the ones most likely to be refused, and a laptop test
 * cannot show that. Run it once after deploying:
 *
 *   curl -H "Authorization: Bearer $ADMIN_TOKEN" "https://YOUR-SITE/api/admin/leetcode-probe?n=8"
 *
 * It sends `n` tiny requests (default 8, max 15) about 700 ms apart and asks
 * about a problem, not a person. If `blocked` is above 0, tracking from this
 * host will not work and the sync should run from somewhere else.
 */
export async function GET(req: Request) {
  const denied = adminDenied(checkAdminHeader(req));
  if (denied) return denied;

  const n = Math.min(15, Math.max(1, Number(new URL(req.url).searchParams.get('n')) || 8));
  const runs: { ok: boolean; status: number | null; ms: number }[] = [];
  for (let i = 0; i < n; i++) {
    runs.push(await probe());
    if (i < n - 1) await new Promise((r) => setTimeout(r, 700));
  }
  const sorted = runs.map((r) => r.ms).sort((a, b) => a - b);
  return NextResponse.json({
    host: req.headers.get('host'),
    sent: n,
    ok: runs.filter((r) => r.ok).length,
    blocked: runs.filter((r) => r.status === 403 || r.status === 429).length,
    failed: runs.filter((r) => r.status === null).length,
    medianMs: sorted[Math.floor(sorted.length / 2)],
    statuses: runs.map((r) => r.status),
  });
}
