/**
 * The Grid of 250: geometry and data for the honeycomb where every hexagon is
 * one real problem in the ladder. Pure and isomorphic (no DOM), so the server
 * can render the same cells the browser then animates.
 *
 * Pointy-top hexagons, the same orientation as the club's logo. Cells are laid
 * out bottom-to-top in ladder order, so Guardian sits at the base and Divine at
 * the peak: the picture is the climb.
 */
import { RANK_KEYS, curriculum, type RankKey } from './curriculum';

export const SQ3 = Math.sqrt(3);

/** Enamel colours per tier. Flat and matte on purpose: medals, not neon. */
export const TIERS: { key: RankKey; name: string; color: string; onPaper: string }[] = [
  { key: 'guardian', name: 'Guardian', color: '#B9B2A8', onPaper: '#8F887D' },
  { key: 'archon', name: 'Archon', color: '#D98A4A', onPaper: '#C9772F' },
  { key: 'legend', name: 'Legend', color: '#B5C0D4', onPaper: '#7C8BA6' },
  { key: 'ancient', name: 'Ancient', color: '#F4C340', onPaper: '#E2A710' },
  { key: 'divine', name: 'Divine', color: '#FF2A4E', onPaper: '#E4002B' },
];

export type LadderProblem = {
  id: number;
  slug: string;
  title: string;
  difficulty: string;
  topic: string;
  rank: RankKey;
  /** 0 = Guardian ... 4 = Divine */
  tier: number;
  /** Position in the whole ladder, 0..249. */
  k: number;
};

/** All 250 problems in ladder order. */
export const LADDER: LadderProblem[] = RANK_KEYS.flatMap((rank, tier) => curriculum[rank].map((p) => ({ ...p, rank, tier, k: 0 }))).map(
  (p, k) => ({ ...p, k }),
);

/** Where each tier starts in LADDER (0, 50, 100, 150, 220) and the total. */
export const TIER_START = RANK_KEYS.reduce<number[]>((acc, key, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + curriculum[RANK_KEYS[i - 1]].length);
  return acc;
}, []);
export const TOTAL = LADDER.length;

export type Cell = LadderProblem & {
  /** Centre, in units of the hexagon's radius (which is 1). */
  x: number;
  y: number;
  /** Row counted from the base of the honeycomb (0 = bottom). */
  row: number;
};

export type Honeycomb = { cells: Cell[]; cols: number; rows: number; width: number; height: number };

/**
 * `cols` cells per row, first row at the bottom. Odd rows are shifted half a
 * cell, which is what makes it a honeycomb. Units are hexagon radii.
 */
export function honeycomb(cols: number): Honeycomb {
  const rows = Math.ceil(TOTAL / cols);
  const cells = LADDER.map((p): Cell => {
    const row = Math.floor(p.k / cols);
    const col = p.k % cols;
    return {
      ...p,
      row,
      x: (col + (row % 2 ? 0.5 : 0) + 0.5) * SQ3,
      y: (rows - 1 - row) * 1.5 + 1,
    };
  });
  return { cells, cols, rows, width: (cols + 0.5) * SQ3, height: (rows - 1) * 1.5 + 2 };
}

/** Points of a pointy-top hexagon centred at (cx, cy) with radius r. */
export function hexPoints(cx: number, cy: number, r: number): string {
  let out = '';
  for (let i = 0; i < 6; i++) {
    const a = ((60 * i - 30) * Math.PI) / 180;
    out += `${(cx + r * Math.cos(a)).toFixed(3)},${(cy + r * Math.sin(a)).toFixed(3)} `;
  }
  return out.trim();
}

/** Small seeded PRNG so server and browser agree on which cells start lit. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * How much of each tier is "solved" in the illustration: a wide base and a
 * narrow peak, because far fewer people reach the top of a ladder.
 */
export const ILLUSTRATIVE_FILL = [0.86, 0.6, 0.36, 0.16, 0.05];
