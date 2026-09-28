import 'server-only';
import { curriculum, type RankKey } from '@/lib/curriculum';
import { currentPlacement, type PlacementView } from '@/lib/placement';
import { REVERIFY_MINUTES } from '@/lib/placement-logic';
import { rankProgress, totalSolved, nextRank, type RankProgress } from '@/lib/progress';
import type { Session } from '@/lib/session';
import { loadSolved } from '@/lib/sync';

/** What the browser is allowed to know about a member. Never ids, emails or hashes. */
export type MemberView = {
  username: string;
  displayName: string;
  rank: RankKey;
  rankSource: string;
  nextRank: RankKey | null;
  /**
   * Which problem set they are working on. Normally their rank. Once Ancient is
   * finished it is Divine: the 30 Hards, which still need an officer's approval
   * of an assessment before the rank itself changes.
   */
  focus: RankKey;
  status: string;
  gapPossible: boolean;
  lastSyncedAt: string | null;
  hideFromLeaderboard: boolean;
  /** Proved account ownership recently enough to start a placement. */
  freshlyVerified: boolean;
  progress: RankProgress;
  totalSolved: number;
  totalProblems: number;
  placement: PlacementView | null;
};

const TOTAL = Object.values(curriculum).reduce((n, set) => n + set.length, 0);

export async function memberView(session: Session): Promise<MemberView> {
  const { member, verifiedAt } = session;
  const solved = await loadSolved(member.id);
  const focus: RankKey =
    member.rank === 'ancient' && rankProgress('ancient', solved).remaining.length === 0
      ? 'divine'
      : member.rank;
  return {
    username: member.leetcode_username,
    displayName: member.display_name,
    rank: member.rank,
    rankSource: member.rank_source,
    nextRank: nextRank(member.rank),
    focus,
    status: member.status,
    gapPossible: member.gap_possible,
    lastSyncedAt: member.last_synced_at ? new Date(member.last_synced_at).toISOString() : null,
    hideFromLeaderboard: member.hide_from_leaderboard,
    freshlyVerified: Date.now() - verifiedAt.getTime() <= REVERIFY_MINUTES * 60_000,
    progress: rankProgress(focus, solved),
    totalSolved: totalSolved(solved),
    totalProblems: TOTAL,
    placement: await currentPlacement(member.id),
  };
}
