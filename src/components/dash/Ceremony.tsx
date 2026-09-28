'use client';

import { useEffect, useMemo, useRef } from 'react';
import { memberPage as M, ranks } from '@/lib/content';
import { mulberry32, TIERS } from '@/lib/hexgrid';
import { RankBadge } from '../RankBadge';
import { Icon } from '../icons';

/**
 * Rank-up ceremony. Full screen: shockwaves, a burst of hexagons, the new badge
 * springing in, and the rank name rising letter by letter. Only shown to
 * people who have not asked for reduced motion; they get a plain banner.
 */
export function Ceremony({ rankKey, onClose }: { rankKey: string; onClose: () => void }) {
  const rank = ranks.find((r) => r.key === rankKey)!;
  const next = ranks.find((r) => r.level === rank.level + 1) ?? null;
  const tier = TIERS[rank.level - 1];
  const btn = useRef<HTMLButtonElement>(null);

  const shards = useMemo(() => {
    const rnd = mulberry32(rank.level * 7919);
    return Array.from({ length: 44 }, (_, i) => {
      const a = rnd() * Math.PI * 2;
      const dist = 140 + rnd() * 380;
      return {
        dx: Math.cos(a) * dist,
        dy: Math.sin(a) * dist * 0.8 - 40,
        r: (rnd() - 0.5) * 540,
        s: 0.5 + rnd() * 1.5,
        size: 10 + rnd() * 26,
        delay: rnd() * 140,
        color: i % 5 === 0 ? '#ffffff' : i % 3 === 0 ? '#F6C453' : tier.color,
      };
    });
  }, [rank.level, tier.color]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    btn.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      // a single control: keep focus on it
      if (e.key === 'Tab') {
        e.preventDefault();
        btn.current?.focus();
      }
    };
    window.addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', key);
    };
  }, [onClose]);

  return (
    <div className="cere" role="dialog" aria-modal="true" aria-labelledby="cere-title" style={{ ['--tier' as string]: tier.color }}>
      <div className="cere-veil" aria-hidden="true" />
      <div className="cere-rings" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="cere-burst" aria-hidden="true">
        {shards.map((s, i) => (
          <i
            key={i}
            className="hex-tile"
            style={{
              ['--dx' as string]: `${s.dx.toFixed(0)}px`,
              ['--dy' as string]: `${s.dy.toFixed(0)}px`,
              ['--r' as string]: `${s.r.toFixed(0)}deg`,
              ['--s' as string]: s.s.toFixed(2),
              width: s.size,
              height: s.size,
              background: s.color,
              animationDelay: `${(0.55 + s.delay / 1000).toFixed(2)}s`,
            }}
          />
        ))}
      </div>

      <div className="cere-body">
        <span className="cere-badge">
          <RankBadge rank={rank} size={220} bg="#0B0C10" />
        </span>
        <span className="verdict on-ink verdict-stamp" data-v="ac" style={{ animationDelay: '0.9s' }}>
          <span className="tick">
            <Icon name="check" size={9} stroke={4} />
          </span>
          Accepted · Rank up
        </span>
        <h2 id="cere-title" className="cere-name font-display caps" aria-label={rank.name}>
          <span aria-hidden="true" className="pcard-line">
            {rank.name.split('').map((ch, i) => (
              <span key={i} className="ch" style={{ ['--c' as string]: i, animationDelay: `${(1.0 + i * 0.07).toFixed(2)}s` }}>
                {ch}
              </span>
            ))}
          </span>
        </h2>
        <p role="status" className="cere-line m-0">
          {M.rankedUp(rank.name)}
        </p>
        {next && (
          <p className="cere-next m-0">
            Next: <b>{next.name}</b> · {next.problems} problems · {next.topics.join(', ')}
          </p>
        )}
        <button ref={btn} type="button" onClick={onClose} className="cere-btn">
          Keep climbing <Icon name="arrow" size={18} stroke={2.4} />
        </button>
      </div>
    </div>
  );
}
