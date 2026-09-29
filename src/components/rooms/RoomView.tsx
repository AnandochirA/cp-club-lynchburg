'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../../app/dash.css';
import '../../app/chat.css';
import { Icon, RankMark } from '../icons';
import { apiDelete, apiGet, apiPost } from '@/lib/client-api';
import { apiErrors, rankName, room as R, ranks } from '@/lib/content';
import type { RankKey } from '@/lib/curriculum';
import { looksLikeCode, normalize, MAX_LEN } from '@/lib/chat-rules';
import type { ChatMessage } from '@/lib/chat';
import { TIERS } from '@/lib/hexgrid';
import { ago } from '@/lib/momentum';

const MARK_BY_KEY = Object.fromEntries(ranks.map((r) => [r.key, r.mark])) as Record<RankKey, (typeof ranks)[number]['mark']>;
const POLL_MS = 4000;
const NEAR_BOTTOM_PX = 140;

function Avatar({ rank, size = 34 }: { rank: RankKey; size?: number }) {
  const idx = ranks.findIndex((r) => r.key === rank);
  const tier = TIERS[Math.max(0, idx)];
  return (
    <span
      className="hex-tile flex shrink-0 items-center justify-center"
      style={{ width: size, height: size, background: tier.color }}
      aria-hidden="true"
    >
      <RankMark kind={MARK_BY_KEY[rank]} size={Math.round(size * 0.52)} face="#0B0C10" />
    </span>
  );
}

function MessageRow({
  msg,
  mineId,
  onDelete,
}: {
  msg: ChatMessage;
  mineId: number;
  onDelete: (id: number) => void;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const mine = msg.memberId === mineId;

  if (msg.deleted) {
    return (
      <li className="msg" data-id={msg.id} data-deleted="1" data-mine={mine ? '1' : undefined}>
        <Avatar rank={msg.rank} />
        <div className="msg-body-col">
          <p className="msg-tomb m-0">
            <Icon name="close" size={12} stroke={2.4} />
            {msg.deletedBy === 'admin' ? R.removedByAdmin : R.removed}
          </p>
        </div>
      </li>
    );
  }

  return (
    <li className="msg" data-id={msg.id} data-mine={mine ? '1' : undefined} data-pending={msg.id < 0 ? '1' : undefined}>
      <Avatar rank={msg.rank} />
      <div className="msg-body-col">
        <div className="msg-meta">
          <span className="msg-name">{mine ? R.you : msg.displayName}</span>
          <span className="msg-time" title={new Date(msg.createdAt).toLocaleString()}>
            {msg.id < 0 ? R.sending : now === null ? '' : ago(new Date(msg.createdAt).getTime(), now)}
          </span>
          {mine && msg.id > 0 && (
            <button type="button" className="msg-del" onClick={() => onDelete(msg.id)} aria-label={R.deleteOwn}>
              <Icon name="close" size={12} stroke={2.6} />
            </button>
          )}
        </div>
        <p className="msg-body m-0">{msg.body}</p>
      </div>
    </li>
  );
}

export function RoomView({
  room,
  memberId,
  initialMessages,
  initialHasMore,
}: {
  room: RankKey;
  memberId: number;
  initialMessages: ChatMessage[];
  initialHasMore: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingNew, setPendingNew] = useState(0);
  const [atBottom, setAtBottom] = useState(true);

  const listRef = useRef<HTMLUListElement>(null);
  const maxIdRef = useRef(0);
  const pollTimer = useRef<number | undefined>(undefined);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    maxIdRef.current = messages.reduce((m, x) => Math.max(m, x.id), maxIdRef.current);
  }, [messages]);

  const scrollToBottom = useCallback((smooth = true) => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => {
    scrollToBottom(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    setAtBottom(near);
    if (near) setPendingNew(0);
  };

  /**
   * Polling. Cursor-based (only ids newer than the highest one seen), so it
   * stays cheap in a quiet room. The tradeoff: if a message you already have
   * open gets deleted (by its author elsewhere, or by an officer), your tab
   * will not see it turn into a tombstone until you revisit the room — a
   * fresh load always shows the true state, this just is not instant for a
   * tab that is already sitting on the old content. Good enough without
   * standing up a push channel for a club chat's traffic.
   */
  const poll = useCallback(async () => {
    const after = maxIdRef.current;
    const res = await apiGet<{ ok: true; messages: ChatMessage[] }>(`/api/chat/${room}?after=${after}`);
    if (!res.ok || res.data.messages.length === 0) return;
    setMessages((prev) => {
      const known = new Set(prev.map((m) => m.id));
      const fresh = res.data.messages.filter((m) => !known.has(m.id));
      return fresh.length ? [...prev, ...fresh] : prev;
    });
    const nearBottom = listRef.current
      ? listRef.current.scrollHeight - listRef.current.scrollTop - listRef.current.clientHeight < NEAR_BOTTOM_PX
      : true;
    if (nearBottom) {
      requestAnimationFrame(() => scrollToBottom());
    } else {
      setPendingNew((n) => n + res.data.messages.length);
    }
  }, [room, scrollToBottom]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') void poll();
      pollTimer.current = window.setTimeout(tick, POLL_MS);
    };
    pollTimer.current = window.setTimeout(tick, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void poll();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(pollTimer.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [poll]);

  /* --------------------------------------------------------- load older */
  const loadOlder = async () => {
    const oldest = messages[0]?.id;
    if (!oldest || loadingOlder) return;
    setLoadingOlder(true);
    const el = listRef.current;
    const before = el ? el.scrollHeight : 0;
    const res = await apiGet<{ ok: true; messages: ChatMessage[]; hasMore: boolean }>(
      `/api/chat/${room}?before=${oldest}`,
    );
    setLoadingOlder(false);
    if (!res.ok) return;
    setMessages((prev) => [...res.data.messages, ...prev]);
    setHasMore(res.data.hasMore);
    requestAnimationFrame(() => {
      if (el) el.scrollTop = el.scrollHeight - before;
    });
  };

  /* --------------------------------------------------------------- send */
  const draftNorm = normalize(draft);
  const codeish = draftNorm !== '' && looksLikeCode(draftNorm);
  const tooLong = draftNorm.length > MAX_LEN;
  const canSend = draftNorm !== '' && !tooLong && !codeish && !sending;

  const send = async () => {
    if (!canSend) return;
    setError(null);
    setSending(true);
    const tempId = -Date.now();
    const optimistic: ChatMessage = {
      id: tempId,
      memberId,
      displayName: R.you,
      rank: room,
      createdAt: new Date().toISOString(),
      body: draftNorm,
      deleted: false,
      deletedBy: null,
      mine: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft('');
    requestAnimationFrame(() => scrollToBottom());

    const res = await apiPost<{ ok: true; message: ChatMessage }>(`/api/chat/${room}`, { body: draftNorm });
    setSending(false);
    if (!res.ok) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setDraft(draftNorm);
      setError(apiErrors[res.error] ?? apiErrors.server);
      areaRef.current?.focus();
      return;
    }
    setMessages((prev) => prev.map((m) => (m.id === tempId ? res.data.message : m)));
    maxIdRef.current = Math.max(maxIdRef.current, res.data.message.id);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm(R.deleteConfirm)) return;
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, deleted: true, deletedBy: 'author', body: '' } : m)));
    const res = await apiDelete(`/api/chat/${room}/${id}`);
    if (!res.ok) setError(apiErrors[res.error] ?? apiErrors.server);
  };

  // Auto-grow the textarea up to a few lines, then it scrolls internally.
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [draft]);

  const charsLeft = MAX_LEN - draft.length;

  return (
    <div className="room-shell" style={{ ['--tier' as string]: TIERS[ranks.findIndex((r) => r.key === room)].color }}>
      <div className="dash-aurora" aria-hidden="true">
        <i />
        <i />
        <b className="hex-bg-ink" />
      </div>

      <ul ref={listRef} className="msg-list" onScroll={onScroll} aria-label={`${rankName(room)} room messages`}>
        {hasMore && (
          <li className="msg-load">
            <button type="button" onClick={loadOlder} disabled={loadingOlder} className="load-older-btn">
              {loadingOlder ? R.loading : R.loadOlder}
            </button>
          </li>
        )}
        {messages.length === 0 && !hasMore && <li className="msg-empty">{R.rules.body}</li>}
        {messages.map((m) => (
          <MessageRow key={m.id} msg={m} mineId={memberId} onDelete={remove} />
        ))}
      </ul>

      {!atBottom && pendingNew > 0 && (
        <button
          type="button"
          className="jump-pill"
          onClick={() => {
            scrollToBottom();
            setPendingNew(0);
          }}
        >
          {R.newMessages(pendingNew)} ↓
        </button>
      )}

      <div className="composer-wrap">
        <p className="composer-rule">
          <Icon name="lock" size={12} stroke={2.2} />
          {R.rules.body}
        </p>
        <div className="composer">
          <textarea
            ref={areaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={R.composerPlaceholder(rankName(room))}
            rows={1}
            maxLength={MAX_LEN + 400}
            disabled={sending}
            className="composer-input"
          />
          <button type="button" onClick={send} disabled={!canSend} className="composer-send" aria-label={R.send}>
            {sending ? <span className="judging" aria-hidden="true"><i style={{ ['--n' as string]: 0 }} /><i style={{ ['--n' as string]: 1 }} /><i style={{ ['--n' as string]: 2 }} /></span> : <Icon name="arrow" size={18} stroke={2.4} />}
          </button>
        </div>
        <div className="composer-foot">
          {codeish ? (
            <span className="composer-warn">{apiErrors.looks_like_code}</span>
          ) : tooLong ? (
            <span className="composer-warn">{apiErrors.too_long}</span>
          ) : error ? (
            <span className="composer-warn">{error}</span>
          ) : (
            <span />
          )}
          {draft.length > MAX_LEN - 200 && <span className="composer-count">{R.charsLeft(charsLeft)}</span>}
        </div>
      </div>
    </div>
  );
}
