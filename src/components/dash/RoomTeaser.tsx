'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '../icons';
import { apiGet } from '@/lib/client-api';
import { rankName, roomsPage as M } from '@/lib/content';
import type { ChatMessage } from '@/lib/chat';
import type { RankKey } from '@/lib/curriculum';
import { ago } from '@/lib/momentum';
import { useNow } from './hooks';

/**
 * A small window into the member's current room, right on the dashboard.
 * Fetches independently (the dashboard's own data has no notion of chat), so
 * it renders its own loading and empty states rather than blocking the page.
 */
export function RoomTeaser({ room }: { room: RankKey }) {
  const [last, setLast] = useState<ChatMessage | 'empty' | null>(null);
  const now = useNow(60_000);

  useEffect(() => {
    let live = true;
    apiGet<{ ok: true; unlocked: boolean; messages: ChatMessage[] }>(`/api/chat/${room}?limit=1`).then((res) => {
      if (!live || !res.ok) return;
      setLast(res.data.messages.length ? res.data.messages[res.data.messages.length - 1] : 'empty');
    });
    return () => {
      live = false;
    };
  }, [room]);

  return (
    <Link href={`/rooms/${room}`} className="panel dx flex items-center gap-4 p-5 no-underline lg:p-7" style={{ ['--dx' as string]: 4 }}>
      <span className="hex-tile grid size-12 shrink-0 place-items-center bg-white/10 text-text">
        <Icon name="chat" size={20} stroke={2} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="eyebrow-m">{M.roomLabel(rankName(room))}</span>
        {last === null ? (
          <span className="text-[14.5px] text-dim">…</span>
        ) : last === 'empty' ? (
          <span className="truncate text-[14.5px] text-soft">{M.empty}</span>
        ) : (
          <span className="truncate text-[14.5px] text-soft">
            <strong className="font-semibold text-text">{last.displayName}</strong>{' '}
            {last.deleted ? M.empty : last.body}
          </span>
        )}
      </span>
      {last !== null && last !== 'empty' && now !== null && (
        <span className="font-mono shrink-0 text-[11.5px] text-dim">{ago(new Date(last.createdAt).getTime(), now)}</span>
      )}
      <Icon name="arrow" size={16} stroke={2.2} className="shrink-0 text-dim" />
    </Link>
  );
}
