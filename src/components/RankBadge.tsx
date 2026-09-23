import type { Rank } from '@/lib/content';
import { RankMark } from './icons';

const HEX = 'polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)';

/** Per-rank metal: outer ring, inner face, mark colour, and the level pip. */
export const SKIN: Record<
  string,
  { ring: string; face: string; dark: string; ink: string; label: string; pip: string; pipInk: string; shadow: string }
> = {
  guardian: {
    ring: 'linear-gradient(160deg, #EAE5DD 0%, #A39C92 55%, #6E6861 100%)',
    face: 'linear-gradient(180deg, #56524D 0%, #312E2A 100%)',
    dark: '#312E2A',
    ink: '#EFEAE2',
    label: '#C9C2B8',
    pip: 'linear-gradient(180deg, #EAE5DD, #A39C92)',
    pipInk: '#2B2825',
    shadow: 'drop-shadow(0 10px 16px rgba(0,0,0,0.5))',
  },
  archon: {
    ring: 'linear-gradient(160deg, #FFD2A6 0%, #D98A4A 45%, #8A4518 100%)',
    face: 'linear-gradient(180deg, #7A421D 0%, #45240D 100%)',
    dark: '#45240D',
    ink: '#FFD7B0',
    label: '#F2A866',
    pip: 'linear-gradient(180deg, #FFD2A6, #D98A4A)',
    pipInk: '#3E1F09',
    shadow: 'drop-shadow(0 10px 16px rgba(0,0,0,0.5))',
  },
  legend: {
    ring: 'linear-gradient(160deg, #FFFFFF 0%, #C3CAD6 45%, #6F7888 100%)',
    face: 'linear-gradient(180deg, #4B556C 0%, #232937 100%)',
    dark: '#232937',
    ink: '#F1F4F9',
    label: '#CDD4E0',
    pip: 'linear-gradient(180deg, #FFFFFF, #B7BFCC)',
    pipInk: '#1F2430',
    shadow: 'drop-shadow(0 10px 18px rgba(0,0,0,0.5)) drop-shadow(0 0 10px rgba(205,212,224,0.14))',
  },
  ancient: {
    ring: 'linear-gradient(160deg, #FFF3C4 0%, #F4C340 42%, #A36A00 100%)',
    face: 'linear-gradient(180deg, #6A4700 0%, #362400 100%)',
    dark: '#362400',
    ink: '#FFE38F',
    label: '#F6C453',
    pip: 'linear-gradient(180deg, #FFF3C4, #F4C340)',
    pipInk: '#3A2700',
    shadow: 'drop-shadow(0 10px 18px rgba(0,0,0,0.5)) drop-shadow(0 0 16px rgba(246,196,83,0.3))',
  },
  divine: {
    ring: 'linear-gradient(160deg, #FFF0B8 0%, #F7B52A 28%, #FF2A4E 60%, #A0001F 100%)',
    face: 'linear-gradient(180deg, #E3002D 0%, #720015 100%)',
    dark: '#720015',
    ink: '#FFD86E',
    label: '#FF5C77',
    pip: 'linear-gradient(180deg, #FFF0B8, #F7B52A)',
    pipInk: '#5C0011',
    shadow:
      'drop-shadow(0 12px 22px rgba(0,0,0,0.55)) drop-shadow(0 0 24px rgba(255,42,78,0.45)) drop-shadow(0 0 40px rgba(247,181,42,0.28))',
  },
};

export function RankBadge({
  rank,
  size,
  dim = false,
  pip = true,
  effects = true,
  bg = '#14151B',
}: {
  rank: Rank;
  size: number;
  dim?: boolean;
  pip?: boolean;
  effects?: boolean;
  bg?: string;
}) {
  const s = SKIN[rank.key];
  const top = rank.key === 'divine' && effects;
  const inset = Math.max(3, Math.round(size * 0.07));

  return (
    <span
      aria-hidden="true"
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size, filter: dim ? 'grayscale(0.7) opacity(0.5)' : s.shadow }}
    >
      {top && (
        <>
          <span
            className="anim-shine absolute rounded-full blur-[6px]"
            style={{
              inset: -size * 0.22,
              background:
                'radial-gradient(closest-side, rgba(255,42,78,0.55), rgba(247,181,42,0.18) 55%, rgba(247,181,42,0) 78%)',
            }}
          />
          {[
            { top: '2%', left: '84%', d: '0s', sz: size * 0.16 },
            { top: '78%', left: '-6%', d: '1.1s', sz: size * 0.12 },
            { top: '88%', left: '92%', d: '2s', sz: size * 0.1 },
          ].map((sp, i) => (
            <span
              key={i}
              className="anim-twinkle absolute"
              style={{ top: sp.top, left: sp.left, animationDelay: sp.d }}
            >
              <svg width={sp.sz} height={sp.sz} viewBox="0 0 24 24" fill="#FFE9A8">
                <path d="M12 1.8 14.1 9.9 22.2 12 14.1 14.1 12 22.2 9.9 14.1 1.8 12 9.9 9.9z" />
              </svg>
            </span>
          ))}
        </>
      )}

      {/* outer ring */}
      <span
        className="absolute inset-0"
        style={{ background: s.ring, clipPath: HEX }}
      />
      {/* inner face */}
      <span
        className="absolute"
        style={{ inset, background: s.face, clipPath: HEX }}
      />
      {/* top gloss */}
      <span
        className="absolute"
        style={{
          inset,
          clipPath: HEX,
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.05) 42%, rgba(255,255,255,0) 60%)',
        }}
      />
      <span className="relative flex items-center justify-center" style={{ color: s.ink }}>
        <RankMark kind={rank.mark} size={Math.round(size * 0.46)} face={s.dark} />
      </span>

      {pip && (
        <span
          className="font-mono absolute flex items-center justify-center rounded-full font-bold"
          style={{
            width: Math.round(size * 0.3),
            height: Math.round(size * 0.3),
            bottom: -Math.round(size * 0.06),
            background: s.pip,
            color: s.pipInk,
            fontSize: Math.max(9, Math.round(size * 0.15)),
            boxShadow: `0 0 0 ${Math.max(2, Math.round(size * 0.035))}px ${bg}`,
          }}
        >
          {rank.level}
        </span>
      )}
    </span>
  );
}
