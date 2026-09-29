import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import '../../chat.css';
import { Icon } from '@/components/icons';
import { canUseRoom, listRoom } from '@/lib/chat';
import { rankName, ranks, roomsPage as M } from '@/lib/content';
import type { RankKey } from '@/lib/curriculum';
import { isRankKey } from '@/lib/progress';
import { RoomView } from '@/components/rooms/RoomView';
import { TIERS } from '@/lib/hexgrid';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ rank: string }> }): Promise<Metadata> {
  const { rank } = await params;
  const title = isRankKey(rank) ? `${rankName(rank)} room` : M.title;
  return { title, robots: { index: false, follow: false } };
}

/** One rank's room: a live feed you scroll and a composer, or — if you have
 * not reached this rank yet — an honest "not yet" instead of a 404, since the
 * URL is guessable and being blocked is the expected, not broken, state. */
export default async function RoomPage({ params }: { params: Promise<{ rank: string }> }) {
  const { rank } = await params;
  if (!isRankKey(rank)) notFound();

  const session = await getSession();
  if (!session) redirect('/signin');

  const unlocked = canUseRoom(session.member.rank, rank);
  const tier = TIERS[ranks.findIndex((r) => r.key === rank)];

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-ink text-text">
      <header className="room-header">
        <Link href="/rooms" className="font-mono text-sm text-muted no-underline hover:text-text">
          ← {M.back}
        </Link>
        <nav className="room-switcher" aria-label="Rooms">
          {ranks.map((r, i) => {
            const on = canUseRoom(session.member.rank, r.key);
            const current = r.key === rank;
            const pillStyle = { ['--pill-tc' as string]: TIERS[i].color };
            return on ? (
              <Link
                key={r.key}
                href={`/rooms/${r.key}`}
                className="switch-pill"
                aria-current={current ? 'true' : undefined}
                style={pillStyle}
              >
                <span className="dot" aria-hidden="true" />
                {r.name}
              </Link>
            ) : (
              <span key={r.key} className="switch-pill" data-locked="1" style={pillStyle} title={M.lockedNote(r.name)}>
                <Icon name="lock" size={11} stroke={2.4} />
                {r.name}
              </span>
            );
          })}
        </nav>
      </header>

      {!unlocked ? (
        <div className="locked-room">
          <span className="locked-room-badge">
            <Icon name="lock" size={32} stroke={1.8} />
          </span>
          <h1 className="font-display caps m-0 text-[36px] leading-[0.9] font-black">{M.roomLabel(rankName(rank))}</h1>
          <p className="m-0 max-w-[42ch] text-[15px] leading-[1.55] text-muted">{M.lockedNote(rankName(rank))}</p>
          <Link href="/me" className="btn btn-primary mt-2 flex h-12 items-center justify-center rounded-none px-6 text-[15px] font-semibold text-white no-underline hover:text-white">
            My progress
          </Link>
        </div>
      ) : (
        <RoomRoot rank={rank} memberId={session.member.id} />
      )}
    </main>
  );
}

async function RoomRoot({ rank, memberId }: { rank: RankKey; memberId: number }) {
  const { messages, hasMore } = await listRoom(rank, memberId);
  return <RoomView room={rank} memberId={memberId} initialMessages={messages} initialHasMore={hasMore} />;
}
