'use client';

import { useMemo, useRef, useState } from 'react';
import { STAGES, interviewCopy as C } from '@/lib/interview-kit';
import { clock, type Draft, type Metrics } from '@/lib/interview-logic';
import { film, type MomentKind } from '@/lib/film';

const W = 1000;
const H = 132;
const KIND_COLOR: Record<MomentKind, string> = {
  idea: '#52d68a',
  complexity: '#7cc4ff',
  silence: '#ff5c77',
  markedDown: '#ff5c77',
  nudge: '#f6c453',
  followup: '#c89bff',
  curveball: '#f6c453',
  interrupt: '#ff8fa1',
  steer: '#ff8fa1',
  rush: '#ff8fa1',
  repeat: '#ff8fa1',
  ai: '#c89bff',
};
const STAGE_TINT = ['#2a2f3d', '#30293d', '#3d2f29', '#293d33', '#3d3a29', '#2f293d', '#293a3d'];

/**
 * The round as tape. Top lane: which step you were on. Middle: when you were
 * talking (bars), when the coach was (thin bars above), and every silence
 * over 20 seconds (red). Bottom: the moments worth rewinding to. Hover to
 * see what was said at that point; click, or pick a moment, to jump the
 * transcript there.
 */
export function GameFilm({
  draft,
  metrics,
  markedDown,
  onSeek,
}: {
  draft: Draft;
  metrics: Metrics | null;
  markedDown?: { at: string; why: string } | null;
  onSeek: (line: number) => void;
}) {
  const f = useMemo(() => film(draft, metrics, markedDown), [draft, metrics, markedDown]);
  const box = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ x: number; at: number } | null>(null);
  const x = (ms: number) => (ms / f.total) * W;
  const lines = draft.transcript;

  const nearest = (at: number) => {
    let best = -1;
    lines.forEach((l, i) => {
      if (l.at <= at + 4000 && (best < 0 || l.at > lines[best].at)) best = i;
    });
    return best;
  };
  const toAt = (clientX: number) => {
    const r = box.current!.getBoundingClientRect();
    const px = Math.max(0, Math.min(r.width, clientX - r.left));
    return { x: px, at: (px / r.width) * f.total };
  };
  const hoverLine = hover ? nearest(hover.at) : -1;
  const ticks = Array.from({ length: Math.floor(f.total / 300_000) + 1 }, (_, i) => i * 300_000);

  return (
    <div className="film flex flex-col gap-4">
      <div
        ref={box}
        className="film-strip"
        onPointerMove={(e) => setHover(toAt(e.clientX))}
        onPointerLeave={() => setHover(null)}
        onClick={(e) => {
          const i = nearest(toAt(e.clientX).at);
          if (i >= 0) onSeek(i);
        }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`Timeline of the round, ${clock(f.total)} long`}>
          {f.segments.map((s, i) => (
            <g key={i}>
              <rect x={x(s.from)} y={0} width={Math.max(0, x(s.to) - x(s.from))} height={20} fill={STAGE_TINT[STAGES.findIndex((t) => t.id === s.stage)]} />
            </g>
          ))}
          {f.gaps.map((g, i) => (
            <rect key={i} x={x(g.from)} y={28} width={x(g.to) - x(g.from)} height={56} className="film-gap" />
          ))}
          {f.coach.map((s, i) => (
            <rect key={i} x={x(s.from)} y={30} width={Math.max(1.5, x(s.to) - x(s.from))} height={6} className="film-coach" />
          ))}
          {f.speech.map((s, i) => (
            <rect key={i} x={x(s.from)} y={42} width={Math.max(1.5, x(s.to) - x(s.from))} height={40} className="film-you" />
          ))}
          {f.moments.map((m, i) => (
            <rect key={i} x={x(m.at) - 3} y={96} width={6} height={14} fill={KIND_COLOR[m.kind]} />
          ))}
          {ticks.map((t) => (
            <line key={t} x1={x(t)} x2={x(t)} y1={116} y2={122} className="film-tick" />
          ))}
        </svg>
        <div className="film-labels" aria-hidden="true">
          {f.segments.map((s, i) =>
            x(s.to) - x(s.from) > 70 ? (
              <span key={i} style={{ left: `${(x(s.from) / W) * 100}%`, width: `${((x(s.to) - x(s.from)) / W) * 100}%` }}>
                {STAGES.find((t) => t.id === s.stage)!.title}
              </span>
            ) : null,
          )}
        </div>
        <div className="film-axis font-mono" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} style={{ left: `${(x(t) / W) * 100}%` }}>
              {clock(t)}
            </span>
          ))}
        </div>
        {hover && (
          <>
            <i className="film-head" style={{ left: hover.x }} aria-hidden="true" />
            <div className="film-tip" style={{ left: Math.min(hover.x, (box.current?.clientWidth ?? 0) - 260) }} aria-hidden="true">
              <b className="font-mono">{clock(hover.at)}</b>
              {hoverLine >= 0 ? (
                <span>
                  {lines[hoverLine].who === 'you' ? 'You: ' : 'Interviewer: '}
                  {lines[hoverLine].text}
                </span>
              ) : (
                <span className="text-dim">—</span>
              )}
            </div>
          </>
        )}
      </div>

      <div className="film-legend font-mono" aria-hidden="true">
        <span>
          <i className="you" /> {C.film.you}
        </span>
        <span>
          <i className="coach" /> {C.film.coach}
        </span>
        <span>
          <i className="gap" /> {C.film.gap}
        </span>
      </div>

      {f.moments.length > 0 && (
        <ol className="film-moments m-0 list-none p-0" aria-label={C.film.moments}>
          {f.moments.map((m, i) => (
            <li key={i}>
              <button type="button" disabled={m.line === null} onClick={() => m.line !== null && onSeek(m.line)} style={{ ['--mc' as string]: KIND_COLOR[m.kind] }}>
                <span className="font-mono">{clock(m.at)}</span>
                <span>{m.label}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
