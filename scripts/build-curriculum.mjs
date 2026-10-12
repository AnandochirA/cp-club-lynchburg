/**
 * Builds src/lib/curriculum.ts (the 250-problem ladder) and
 * src/lib/placement-pool.ts (server-only placement problems) from the slug
 * lists below, asking LeetCode for each problem's real title and difficulty.
 *
 *   node scripts/build-curriculum.mjs
 *
 * Exits non-zero, and writes nothing, unless every check passes:
 *   - per-rank counts are 50 / 50 / 50 / 70 / 30 (250 total)
 *   - every problem exists, is free, and its number matches the slug
 *   - no slug appears twice across the ladder or the placement pool
 *   - every Divine problem is Hard
 *   - the ladder's Easy / Medium / Hard counts match MIX exactly
 *   - the placement pool has at least 8 problems per tier, tier difficulty
 *     fits, and none of them are in the ladder
 *
 * The generated files are committed. Re-run this after editing the lists.
 * LeetCode's GraphQL is unofficial: requests are small, spaced out, and retried
 * politely on 403/429.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * "number:slug" pairs, roughly easy -> hard within each topic.
 *
 * The ladder is interview prep, not a first course: every free Blind 75 and
 * NeetCode 150 problem (minus a handful of warm-up Easies), plus the Mediums and
 * Hards that keep showing up in big-tech online assessments and onsites. The mix
 * is held to MIX below: about 5% Easy, 80% Medium, 15% Hard.
 */
const LADDER = {
  guardian: [
    ['Arrays & hashing', '1:two-sum 49:group-anagrams 347:top-k-frequent-elements 238:product-of-array-except-self 36:valid-sudoku 128:longest-consecutive-sequence 560:subarray-sum-equals-k 974:subarray-sums-divisible-by-k 525:contiguous-array 523:continuous-subarray-sum 380:insert-delete-getrandom-o1 189:rotate-array 334:increasing-triplet-subsequence 454:4sum-ii 229:majority-element-ii 289:game-of-life 274:h-index 451:sort-characters-by-frequency 791:custom-sort-string 12:integer-to-roman'],
    ['Two pointers', '125:valid-palindrome 167:two-sum-ii-input-array-is-sorted 15:3sum 11:container-with-most-water 16:3sum-closest 18:4sum 80:remove-duplicates-from-sorted-array-ii 75:sort-colors 881:boats-to-save-people 1679:max-number-of-k-sum-pairs 31:next-permutation 611:valid-triangle-number 986:interval-list-intersections 42:trapping-rain-water'],
    ['Stack', '20:valid-parentheses 155:min-stack 150:evaluate-reverse-polish-notation 22:generate-parentheses 739:daily-temperatures 853:car-fleet 71:simplify-path 394:decode-string 735:asteroid-collision 503:next-greater-element-ii 901:online-stock-span 907:sum-of-subarray-minimums 402:remove-k-digits 227:basic-calculator-ii 1249:minimum-remove-to-make-valid-parentheses 84:largest-rectangle-in-histogram'],
  ],
  archon: [
    ['Sliding window', '121:best-time-to-buy-and-sell-stock 3:longest-substring-without-repeating-characters 424:longest-repeating-character-replacement 567:permutation-in-string 209:minimum-size-subarray-sum 1004:max-consecutive-ones-iii 904:fruit-into-baskets 438:find-all-anagrams-in-a-string 1423:maximum-points-you-can-obtain-from-cards 713:subarray-product-less-than-k 1358:number-of-substrings-containing-all-three-characters 1658:minimum-operations-to-reduce-x-to-zero 1838:frequency-of-the-most-frequent-element 1248:count-number-of-nice-subarrays 1493:longest-subarray-of-1s-after-deleting-one-element 76:minimum-window-substring 239:sliding-window-maximum'],
    ['Binary search', '74:search-a-2d-matrix 875:koko-eating-bananas 153:find-minimum-in-rotated-sorted-array 33:search-in-rotated-sorted-array 981:time-based-key-value-store 34:find-first-and-last-position-of-element-in-sorted-array 162:find-peak-element 1011:capacity-to-ship-packages-within-d-days 81:search-in-rotated-sorted-array-ii 658:find-k-closest-elements 1482:minimum-number-of-days-to-make-m-bouquets 1552:magnetic-force-between-two-balls 540:single-element-in-a-sorted-array 378:kth-smallest-element-in-a-sorted-matrix 4:median-of-two-sorted-arrays'],
    ['Linked list', '206:reverse-linked-list 21:merge-two-sorted-lists 141:linked-list-cycle 143:reorder-list 19:remove-nth-node-from-end-of-list 138:copy-list-with-random-pointer 2:add-two-numbers 287:find-the-duplicate-number 146:lru-cache 142:linked-list-cycle-ii 24:swap-nodes-in-pairs 148:sort-list 92:reverse-linked-list-ii 82:remove-duplicates-from-sorted-list-ii 61:rotate-list 328:odd-even-linked-list 445:add-two-numbers-ii 23:merge-k-sorted-lists'],
  ],
  legend: [
    ['Trees', '226:invert-binary-tree 104:maximum-depth-of-binary-tree 100:same-tree 572:subtree-of-another-tree 235:lowest-common-ancestor-of-a-binary-search-tree 102:binary-tree-level-order-traversal 199:binary-tree-right-side-view 1448:count-good-nodes-in-binary-tree 98:validate-binary-search-tree 230:kth-smallest-element-in-a-bst 105:construct-binary-tree-from-preorder-and-inorder-traversal 236:lowest-common-ancestor-of-a-binary-tree 103:binary-tree-zigzag-level-order-traversal 113:path-sum-ii 114:flatten-binary-tree-to-linked-list 437:path-sum-iii 337:house-robber-iii 863:all-nodes-distance-k-in-binary-tree 662:maximum-width-of-binary-tree 106:construct-binary-tree-from-inorder-and-postorder-traversal 116:populating-next-right-pointers-in-each-node 450:delete-node-in-a-bst 173:binary-search-tree-iterator 1110:delete-nodes-and-return-forest 979:distribute-coins-in-binary-tree 958:check-completeness-of-a-binary-tree 124:binary-tree-maximum-path-sum'],
    ['Tries', '208:implement-trie-prefix-tree 211:design-add-and-search-words-data-structure 648:replace-words 1268:search-suggestions-system 421:maximum-xor-of-two-numbers-in-an-array 677:map-sum-pairs'],
    ['Heap', '973:k-closest-points-to-origin 215:kth-largest-element-in-an-array 621:task-scheduler 355:design-twitter 692:top-k-frequent-words 767:reorganize-string 1642:furthest-building-you-can-reach 1405:longest-happy-string 1834:single-threaded-cpu 264:ugly-number-ii 373:find-k-pairs-with-smallest-sums 2542:maximum-subsequence-score 1353:maximum-number-of-events-that-can-be-attended 1962:remove-stones-to-minimize-the-total 2462:total-cost-to-hire-k-workers 1481:least-number-of-unique-integers-after-k-removals 846:hand-of-straights'],
  ],
  ancient: [
    ['Backtracking', '78:subsets 39:combination-sum 40:combination-sum-ii 46:permutations 90:subsets-ii 47:permutations-ii 79:word-search 131:palindrome-partitioning 17:letter-combinations-of-a-phone-number 93:restore-ip-addresses 77:combinations'],
    ['Graphs', '200:number-of-islands 695:max-area-of-island 133:clone-graph 994:rotting-oranges 417:pacific-atlantic-water-flow 130:surrounded-regions 207:course-schedule 210:course-schedule-ii 684:redundant-connection 785:is-graph-bipartite 547:number-of-provinces 721:accounts-merge 399:evaluate-division 1584:min-cost-to-connect-all-points 743:network-delay-time 787:cheapest-flights-within-k-stops 1631:path-with-minimum-effort'],
    ['1-D dynamic programming', '70:climbing-stairs 198:house-robber 213:house-robber-ii 5:longest-palindromic-substring 647:palindromic-substrings 91:decode-ways 322:coin-change 152:maximum-product-subarray 139:word-break 300:longest-increasing-subsequence 416:partition-equal-subset-sum 279:perfect-squares'],
    ['2-D dynamic programming', '62:unique-paths 64:minimum-path-sum 1143:longest-common-subsequence 309:best-time-to-buy-and-sell-stock-with-cooldown 518:coin-change-ii 494:target-sum 97:interleaving-string 72:edit-distance 221:maximal-square 516:longest-palindromic-subsequence'],
    ['Greedy', '53:maximum-subarray 55:jump-game 45:jump-game-ii 134:gas-station 1899:merge-triplets-to-form-target-triplet 763:partition-labels 678:valid-parenthesis-string'],
    ['Intervals', '56:merge-intervals 57:insert-interval 435:non-overlapping-intervals 452:minimum-number-of-arrows-to-burst-balloons'],
    ['Math & bits', '338:counting-bits 48:rotate-image 54:spiral-matrix 73:set-matrix-zeroes 50:powx-n 43:multiply-strings 2013:detect-squares 371:sum-of-two-integers 7:reverse-integer'],
  ],
  divine: [
    ['Arrays, stack, design', '41:first-missing-positive 32:longest-valid-parentheses 85:maximal-rectangle 224:basic-calculator 68:text-justification 135:candy 25:reverse-nodes-in-k-group 460:lfu-cache 295:find-median-from-data-stream'],
    ['Heap, intervals, scheduling', '480:sliding-window-median 632:smallest-range-covering-elements-from-k-lists 502:ipo 1851:minimum-interval-to-include-each-query 1235:maximum-profit-in-job-scheduling'],
    ['Trees, tries, backtracking', '297:serialize-and-deserialize-binary-tree 212:word-search-ii 51:n-queens 140:word-break-ii 301:remove-invalid-parentheses'],
    ['Graphs', '127:word-ladder 815:bus-routes 332:reconstruct-itinerary 778:swim-in-rising-water 329:longest-increasing-path-in-a-matrix'],
    ['Dynamic programming', '115:distinct-subsequences 123:best-time-to-buy-and-sell-stock-iii 174:dungeon-game 312:burst-balloons 44:wildcard-matching 10:regular-expression-matching'],
  ],
};

const EXPECTED = { guardian: 50, archon: 50, legend: 50, ancient: 70, divine: 30 };
/** Exact difficulty mix of the whole ladder: 13 / 200 / 37 of 250 = 5% / 80% / 15%. */
const MIX = { Easy: 13, Medium: 200, Hard: 37 };

/** Placement pool: one tier per rank below Divine. None may be in LADDER. */
const POOL = {
  1: { allow: ['Medium'], items: '442:find-all-duplicates-in-an-array 1010:pairs-of-songs-with-total-durations-divisible-by-60 2352:equal-row-and-column-pairs 1347:minimum-number-of-steps-to-make-two-strings-anagram 921:minimum-add-to-make-parentheses-valid 1209:remove-all-adjacent-duplicates-in-string-ii 2390:removing-stars-from-a-string 1855:maximum-distance-between-a-pair-of-values' },
  2: { allow: ['Medium'], items: '1456:maximum-number-of-vowels-in-a-substring-of-given-length 2024:maximize-the-confusion-of-an-exam 2461:maximum-sum-of-distinct-subarrays-with-length-k 1760:minimum-limit-of-balls-in-a-bag 2187:minimum-time-to-complete-trips 2300:successful-pairs-of-spells-and-potions 1721:swapping-nodes-in-a-linked-list 2130:maximum-twin-sum-of-a-linked-list' },
  3: { allow: ['Medium'], items: '1302:deepest-leaves-sum 1315:sum-of-nodes-with-even-valued-grandparent 1161:maximum-level-sum-of-a-binary-tree 515:find-largest-value-in-each-tree-row 654:maximum-binary-tree 1845:seat-reservation-manager 2336:smallest-number-in-infinite-set 1338:reduce-array-size-to-the-half' },
  4: { allow: ['Medium', 'Hard'], items: '1091:shortest-path-in-binary-matrix 1239:maximum-length-of-a-concatenated-string-with-unique-characters 1466:reorder-routes-to-make-all-paths-lead-to-the-city-zero 841:keys-and-rooms 1926:nearest-exit-from-entrance-in-maze 1219:path-with-maximum-gold 1035:uncrossed-lines 714:best-time-to-buy-and-sell-stock-with-transaction-fee' },
};

const parse = (s) => s.trim().split(/\s+/).map((t) => { const i = t.indexOf(':'); return { id: Number(t.slice(0, i)), slug: t.slice(i + 1) }; });

const ladder = [];
for (const [rank, topics] of Object.entries(LADDER)) {
  for (const [topic, items] of topics) for (const p of parse(items)) ladder.push({ ...p, rank, topic });
}
const pool = [];
for (const [tier, { items }] of Object.entries(POOL)) for (const p of parse(items)) pool.push({ ...p, tier: Number(tier) });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function gql(query, attempt = 1) {
  const res = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      referer: 'https://leetcode.com',
      'user-agent': 'cp-club-lynchburg/1.0 (curriculum build)',
    },
    body: JSON.stringify({ query }),
  });
  if ((res.status === 403 || res.status === 429) && attempt <= 4) {
    console.log(`  LeetCode said ${res.status}; waiting ${15 * attempt}s (attempt ${attempt})`);
    await sleep(15000 * attempt);
    return gql(query, attempt + 1);
  }
  if (!res.ok) throw new Error(`LeetCode HTTP ${res.status}`);
  return (await res.json()).data ?? {};
}

const problems = [...ladder, ...pool];
const info = new Map();
for (let i = 0; i < problems.length; i += 20) {
  const chunk = problems.slice(i, i + 20);
  const q = 'query{' + chunk.map((p, j) => `q${j}:question(titleSlug:${JSON.stringify(p.slug)}){questionFrontendId title difficulty isPaidOnly}`).join(' ') + '}';
  const data = await gql(q);
  chunk.forEach((p, j) => info.set(p.slug, data[`q${j}`]));
  process.stdout.write(`\rchecked ${Math.min(i + 20, problems.length)}/${problems.length}`);
  await sleep(1200);
}
console.log();

const errors = [];
for (const [rank, want] of Object.entries(EXPECTED)) {
  const got = ladder.filter((p) => p.rank === rank).length;
  if (got !== want) errors.push(`${rank}: ${got} problems, expected ${want}`);
}
const seen = new Set();
for (const p of problems) {
  if (seen.has(p.slug)) errors.push(`duplicate: ${p.slug}`);
  seen.add(p.slug);
  const x = info.get(p.slug);
  if (!x) { errors.push(`not found: ${p.id} ${p.slug}`); continue; }
  if (x.isPaidOnly) errors.push(`premium: ${p.id} ${p.slug}`);
  if (String(p.id) !== x.questionFrontendId) errors.push(`number mismatch: ${p.slug} is #${x.questionFrontendId}, not #${p.id}`);
  if (p.rank === 'divine' && x.difficulty !== 'Hard') errors.push(`divine must be Hard: ${p.id} ${p.slug} is ${x.difficulty}`);
  if (p.tier && !POOL[p.tier].allow.includes(x.difficulty)) errors.push(`pool tier ${p.tier} needs ${POOL[p.tier].allow.join('/')}: ${p.id} ${p.slug} is ${x.difficulty}`);
}
const gotMix = { Easy: 0, Medium: 0, Hard: 0 };
for (const p of ladder) { const x = info.get(p.slug); if (x) gotMix[x.difficulty]++; }
for (const [d, want] of Object.entries(MIX)) if (gotMix[d] !== want) errors.push(`mix: ${gotMix[d]} ${d}, expected ${want}`);
for (const t of Object.keys(POOL)) {
  const n = pool.filter((p) => p.tier === Number(t)).length;
  if (n < 8) errors.push(`pool tier ${t} has ${n}, needs 8+`);
}
if (errors.length) {
  console.error('\nFAILED:\n  ' + errors.join('\n  '));
  process.exit(1);
}

const root = path.resolve(import.meta.dirname, '..');
const row = (p) => JSON.stringify({ id: p.id, slug: p.slug, title: info.get(p.slug).title, difficulty: info.get(p.slug).difficulty, topic: p.topic });

const curriculumTs = `/**
 * GENERATED by scripts/build-curriculum.mjs. Do not edit by hand: change the
 * lists in that script and re-run it (it re-checks every problem on LeetCode).
 */

export type RankKey = 'guardian' | 'archon' | 'legend' | 'ancient' | 'divine';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type Problem = {
  /** LeetCode's public problem number. */
  id: number;
  /** URL slug: leetcode.com/problems/<slug>. This is what submissions are matched on. */
  slug: string;
  title: string;
  difficulty: Difficulty;
  topic: string;
};

export const RANK_KEYS: RankKey[] = ['guardian', 'archon', 'legend', 'ancient', 'divine'];

export const curriculum: Record<RankKey, Problem[]> = {
${Object.keys(LADDER).map((rank) => `  ${rank}: [\n${ladder.filter((p) => p.rank === rank).map((p) => '    ' + row(p) + ',').join('\n')}\n  ],`).join('\n')}
};
`;

const poolTs = `/**
 * GENERATED by scripts/build-curriculum.mjs. Do not edit by hand.
 *
 * The placement pool. SERVER ONLY: if this reached the browser, members could
 * look up and pre-solve the placement problems. Only API routes may import it.
 */
import 'server-only';
import type { Difficulty } from './curriculum';

export type PoolProblem = { id: number; slug: string; title: string; difficulty: Difficulty };

/** Index 0 is tier 1 (Guardian topics), index 3 is tier 4 (Ancient topics). */
export const PLACEMENT_POOL: PoolProblem[][] = [
${[1, 2, 3, 4].map((t) => `  [\n${pool.filter((p) => p.tier === t).map((p) => '    ' + JSON.stringify({ id: p.id, slug: p.slug, title: info.get(p.slug).title, difficulty: info.get(p.slug).difficulty }) + ',').join('\n')}\n  ],`).join('\n')}
];
`;

await writeFile(path.join(root, 'src/lib/curriculum.ts'), curriculumTs);
await writeFile(path.join(root, 'src/lib/placement-pool.ts'), poolTs);

const mix = {};
for (const p of ladder) { const d = info.get(p.slug).difficulty[0]; (mix[p.rank] ??= { E: 0, M: 0, H: 0 })[d]++; }
console.log(`OK: ${ladder.length} ladder problems, ${pool.length} placement-pool problems.`);
for (const [r, m] of Object.entries(mix)) console.log(`  ${r.padEnd(9)} E${m.E} M${m.M} H${m.H}`);
