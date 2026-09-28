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
 *   - the placement pool has at least 8 problems per tier, tier difficulty
 *     fits, and none of them are in the ladder
 *
 * The generated files are committed. Re-run this after editing the lists.
 * LeetCode's GraphQL is unofficial: requests are small, spaced out, and retried
 * politely on 403/429.
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

/** "number:slug" pairs, easy -> hard within each topic. */
const LADDER = {
  guardian: [
    ['Python syntax', '412:fizz-buzz 1480:running-sum-of-1d-array 2469:convert-the-temperature 1342:number-of-steps-to-reduce-a-number-to-zero 1672:richest-customer-wealth 1470:shuffle-the-array 2011:final-value-of-variable-after-performing-operations 1929:concatenation-of-array 1281:subtract-the-product-and-sum-of-digits-of-an-integer 9:palindrome-number'],
    ['Arrays', '1:two-sum 217:contains-duplicate 121:best-time-to-buy-and-sell-stock 53:maximum-subarray 283:move-zeroes 26:remove-duplicates-from-sorted-array 27:remove-element 88:merge-sorted-array 136:single-number 169:majority-element 268:missing-number 448:find-all-numbers-disappeared-in-an-array 66:plus-one 118:pascals-triangle 350:intersection-of-two-arrays-ii 303:range-sum-query-immutable 724:find-pivot-index 189:rotate-array 238:product-of-array-except-self 54:spiral-matrix 48:rotate-image 73:set-matrix-zeroes'],
    ['Strings', '242:valid-anagram 344:reverse-string 14:longest-common-prefix 392:is-subsequence 205:isomorphic-strings 383:ransom-note 387:first-unique-character-in-a-string 13:roman-to-integer 58:length-of-last-word 28:find-the-index-of-the-first-occurrence-in-a-string 67:add-binary 290:word-pattern 345:reverse-vowels-of-a-string 49:group-anagrams 151:reverse-words-in-a-string 443:string-compression 43:multiply-strings 6:zigzag-conversion'],
  ],
  archon: [
    ['Two pointers', '125:valid-palindrome 167:two-sum-ii-input-array-is-sorted 15:3sum 11:container-with-most-water 42:trapping-rain-water 80:remove-duplicates-from-sorted-array-ii 977:squares-of-a-sorted-array 75:sort-colors 680:valid-palindrome-ii 16:3sum-closest 18:4sum 881:boats-to-save-people 844:backspace-string-compare 1768:merge-strings-alternately 925:long-pressed-name 557:reverse-words-in-a-string-iii 349:intersection-of-two-arrays 455:assign-cookies 1679:max-number-of-k-sum-pairs 917:reverse-only-letters'],
    ['Stack', '20:valid-parentheses 155:min-stack 150:evaluate-reverse-polish-notation 739:daily-temperatures 71:simplify-path 232:implement-queue-using-stacks 225:implement-stack-using-queues 496:next-greater-element-i 503:next-greater-element-ii 853:car-fleet 84:largest-rectangle-in-histogram 1047:remove-all-adjacent-duplicates-in-string 394:decode-string 735:asteroid-collision 682:baseball-game'],
    ['Linked list', '206:reverse-linked-list 21:merge-two-sorted-lists 141:linked-list-cycle 876:middle-of-the-linked-list 19:remove-nth-node-from-end-of-list 234:palindrome-linked-list 143:reorder-list 2:add-two-numbers 142:linked-list-cycle-ii 160:intersection-of-two-linked-lists 203:remove-linked-list-elements 83:remove-duplicates-from-sorted-list 24:swap-nodes-in-pairs 138:copy-list-with-random-pointer 146:lru-cache'],
  ],
  legend: [
    ['Binary search', '704:binary-search 35:search-insert-position 278:first-bad-version 69:sqrtx 374:guess-number-higher-or-lower 367:valid-perfect-square 441:arranging-coins 34:find-first-and-last-position-of-element-in-sorted-array 33:search-in-rotated-sorted-array 153:find-minimum-in-rotated-sorted-array 74:search-a-2d-matrix 875:koko-eating-bananas 162:find-peak-element 981:time-based-key-value-store 1011:capacity-to-ship-packages-within-d-days 410:split-array-largest-sum 4:median-of-two-sorted-arrays 81:search-in-rotated-sorted-array-ii 658:find-k-closest-elements 1482:minimum-number-of-days-to-make-m-bouquets 1552:magnetic-force-between-two-balls 540:single-element-in-a-sorted-array 275:h-index-ii 378:kth-smallest-element-in-a-sorted-matrix 1283:find-the-smallest-divisor-given-a-threshold'],
    ['Sliding window', '643:maximum-average-subarray-i 219:contains-duplicate-ii 3:longest-substring-without-repeating-characters 424:longest-repeating-character-replacement 567:permutation-in-string 76:minimum-window-substring 239:sliding-window-maximum 209:minimum-size-subarray-sum 1004:max-consecutive-ones-iii 904:fruit-into-baskets 438:find-all-anagrams-in-a-string 1423:maximum-points-you-can-obtain-from-cards 1493:longest-subarray-of-1s-after-deleting-one-element 713:subarray-product-less-than-k 1358:number-of-substrings-containing-all-three-characters 1248:count-number-of-nice-subarrays 1052:grumpy-bookstore-owner 1208:get-equal-substrings-within-budget 1695:maximum-erasure-value 1234:replace-the-substring-for-balanced-string 1658:minimum-operations-to-reduce-x-to-zero 1838:frequency-of-the-most-frequent-element 1438:longest-continuous-subarray-with-absolute-diff-less-than-or-equal-to-limit 930:binary-subarrays-with-sum 2401:longest-nice-subarray'],
  ],
  ancient: [
    ['Trees', '104:maximum-depth-of-binary-tree 226:invert-binary-tree 100:same-tree 572:subtree-of-another-tree 101:symmetric-tree 543:diameter-of-binary-tree 112:path-sum 235:lowest-common-ancestor-of-a-binary-search-tree 236:lowest-common-ancestor-of-a-binary-tree 102:binary-tree-level-order-traversal 199:binary-tree-right-side-view 1448:count-good-nodes-in-binary-tree 98:validate-binary-search-tree 230:kth-smallest-element-in-a-bst 105:construct-binary-tree-from-preorder-and-inorder-traversal 103:binary-tree-zigzag-level-order-traversal 113:path-sum-ii 114:flatten-binary-tree-to-linked-list 124:binary-tree-maximum-path-sum 297:serialize-and-deserialize-binary-tree'],
    ['Tries', '208:implement-trie-prefix-tree 211:design-add-and-search-words-data-structure 648:replace-words 1268:search-suggestions-system 421:maximum-xor-of-two-numbers-in-an-array 212:word-search-ii'],
    ['Heap', '703:kth-largest-element-in-a-stream 1046:last-stone-weight 973:k-closest-points-to-origin 215:kth-largest-element-in-an-array 621:task-scheduler 347:top-k-frequent-elements 692:top-k-frequent-words 767:reorganize-string 1642:furthest-building-you-can-reach 355:design-twitter 23:merge-k-sorted-lists 295:find-median-from-data-stream'],
    ['Backtracking', '78:subsets 46:permutations 39:combination-sum 40:combination-sum-ii 90:subsets-ii 47:permutations-ii 79:word-search 131:palindrome-partitioning 17:letter-combinations-of-a-phone-number 22:generate-parentheses 77:combinations 216:combination-sum-iii 93:restore-ip-addresses 51:n-queens'],
    ['Graphs', '733:flood-fill 200:number-of-islands 695:max-area-of-island 133:clone-graph 994:rotting-oranges 207:course-schedule 210:course-schedule-ii 684:redundant-connection 743:network-delay-time 127:word-ladder'],
    ['Dynamic programming', '70:climbing-stairs 198:house-robber 322:coin-change 300:longest-increasing-subsequence 62:unique-paths 139:word-break 1143:longest-common-subsequence 416:partition-equal-subset-sum'],
  ],
  divine: [
    ['Stack, array, design', '85:maximal-rectangle 407:trapping-rain-water-ii 32:longest-valid-parentheses 224:basic-calculator 41:first-missing-positive 25:reverse-nodes-in-k-group 460:lfu-cache 432:all-oone-data-structure'],
    ['Binary search, heap, windows', '1095:find-in-mountain-array 668:kth-smallest-number-in-multiplication-table 719:find-k-th-smallest-pair-distance 480:sliding-window-median 632:smallest-range-covering-elements-from-k-lists 502:ipo 871:minimum-number-of-refueling-stops'],
    ['Trees, tries, backtracking', '968:binary-tree-cameras 472:concatenated-words 745:prefix-and-suffix-search 140:word-break-ii 301:remove-invalid-parentheses'],
    ['Graphs', '126:word-ladder-ii 778:swim-in-rising-water 329:longest-increasing-path-in-a-matrix 332:reconstruct-itinerary 847:shortest-path-visiting-all-nodes'],
    ['Dynamic programming', '174:dungeon-game 10:regular-expression-matching 312:burst-balloons 115:distinct-subsequences 123:best-time-to-buy-and-sell-stock-iii'],
  ],
};

const EXPECTED = { guardian: 50, archon: 50, legend: 50, ancient: 70, divine: 30 };

/** Placement pool: one tier per rank below Divine. None may be in LADDER. */
const POOL = {
  1: { allow: ['Easy'], items: '1748:sum-of-unique-elements 1436:destination-city 1207:unique-number-of-occurrences 1732:find-the-highest-altitude 1704:determine-if-string-halves-are-alike 2000:reverse-prefix-of-word 2085:count-common-words-with-one-occurrence 1812:determine-color-of-a-chessboard-square' },
  2: { allow: ['Medium'], items: '1721:swapping-nodes-in-a-linked-list 82:remove-duplicates-from-sorted-list-ii 61:rotate-list 86:partition-list 1249:minimum-remove-to-make-valid-parentheses 921:minimum-add-to-make-parentheses-valid 165:compare-version-numbers 2130:maximum-twin-sum-of-a-linked-list' },
  3: { allow: ['Medium'], items: '852:peak-index-in-a-mountain-array 1760:minimum-limit-of-balls-in-a-bag 2187:minimum-time-to-complete-trips 2300:successful-pairs-of-spells-and-potions 1456:maximum-number-of-vowels-in-a-substring-of-given-length 2024:maximize-the-confusion-of-an-exam 2461:maximum-sum-of-distinct-subarrays-with-length-k 1802:maximum-value-at-a-given-index-in-a-bounded-array' },
  4: { allow: ['Medium', 'Hard'], items: '337:house-robber-iii 863:all-nodes-distance-k-in-binary-tree 1091:shortest-path-in-binary-matrix 785:is-graph-bipartite 130:surrounded-regions 2233:maximum-product-after-k-increments 1239:maximum-length-of-a-concatenated-string-with-unique-characters 417:pacific-atlantic-water-flow' },
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
