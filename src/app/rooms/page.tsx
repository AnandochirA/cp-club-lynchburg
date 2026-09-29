import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import '../chat.css';
import { Icon, RankMark } from '@/components/icons';
import { ranks, roomsPage as M } from '@/lib/content';
import { roomsOverview } from '@/lib/chat';
import { TIERS } from '@/lib/hexgrid';
import { getSession } from '@/lib/session';
import { ago } from '@/lib/momentum';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: M.title.replace(/\.$/, ''), robots: { index: false, follow: false } };

/** The five study rooms, one per rank. Locked ones show nothing but the
 * lock: not even a count, so a room a member has not reached yet is never a
 * preview of what is waiting there. */
export default async function RoomsPage() {
  const session = await getSession();
  if (!session) redirect('/signin');

  const rooms = await roomsOverview(session.member.rank);

  return (
    <main className="flex min-h-dvh flex-col bg-ink text-text">
      <header className="room-header">
        <Link href="/me" className="font-mono text-sm text-muted no-underline hover:text-text">
          ← My progress
        </Link>
      </header>

      <div className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-6 px-5 py-10 lg:px-0 lg:py-16">
        <div className="flex flex-col gap-2">
          <span className="eyebrow-m">{M.eyebrow}</span>
          <h1 className="font-display caps m-0 text-[52px] leading-[0.85] font-black lg:text-[72px]">{M.title}</h1>
          <p className="m-0 max-w-[52ch] text-[15.5px] leading-[1.55] text-muted">{M.sub}</p>
        </div>

        <ul className="room-index-grid m-0 list-none p-0">
          {rooms.map((r) => {
            const rank = ranks.find((x) => x.key === r.rank)!;
            const tier = TIERS[rank.level - 1];
            const card = (
              <>
                <span className="room-card-badge" style={{ ['--tier' as string]: tier.color, background: tier.color }}>
                  {r.unlocked ? (
                    <RankMark kind={rank.mark} size={26} face="#0B0C10" />
                  ) : (
                    <Icon name="lock" size={22} stroke={2.2} className="text-[#0B0C10]" />
                  )}
                </span>
                <span className="room-card-body">
                  <p className="font-display caps room-card-name m-0 font-black">{M.roomLabel(rank.name)}</p>
                  <p className="room-card-preview">
                    {!r.unlocked ? (
                      <span className="room-card-lock">
                        <Icon name="lock" size={12} stroke={2.4} />
                        {M.lockedNote(rank.name)}
                      </span>
                    ) : r.last ? (
                      `${r.last.displayName}: ${r.last.deleted ? M.empty : r.last.body}`
                    ) : (
                      M.empty
                    )}
                  </p>
                </span>
                {r.unlocked && (
                  <span className="room-card-meta">
                    {M.messages(r.messageCount)}
                    {r.last && (
                      <>
                        <br />
                        {ago(new Date(r.last.createdAt).getTime(), Date.now())}
                      </>
                    )}
                  </span>
                )}
              </>
            );
            return (
              <li key={r.rank}>
                {r.unlocked ? (
                  <Link href={`/rooms/${r.rank}`} className="room-card" style={{ ['--tier' as string]: tier.color }}>
                    {card}
                  </Link>
                ) : (
                  <div className="room-card" data-locked="1" style={{ ['--tier' as string]: tier.color }}>
                    {card}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
